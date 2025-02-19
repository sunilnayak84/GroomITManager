import { Router, Request, Response } from 'express';
import { admin } from './firebase';
import * as Express from 'express';
import { staffManagementRouter } from './api/staff-management';

const router = Router();

// Global API request logging middleware
router.use((req, res, next) => {
  console.log('[API] Request:', {
    method: req.method,
    url: req.url,
    path: req.path,
    body: req.body,
    baseUrl: req.baseUrl
  });
  next();
});

// Legacy staff creation endpoint - will be deprecated
router.post('/staff/create', async (req: Request, res: Response) => {
  console.log('[STAFF] Creation request received:', req.body);
  try {
    const { email, password, name, role, phone, specialties, experienceYears, maxDailyAppointments, walkingPreferences } = req.body;

    // Input validation
    if (!email || !name || !role || !phone) {
      return res.status(400).json({
        message: 'Missing required fields',
        details: { email: !email, name: !name, role: !role, phone: !phone }
      });
    }

    // Create user in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email,
      password: password || 'Welcome123!',
      displayName: name,
      phoneNumber: phone,
      disabled: false
    });

    // Set custom claims
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      role,
      isStaff: true,
      createdAt: new Date().toISOString()
    });

    // Create Firestore document
    const userData = {
      id: userRecord.uid,
      email,
      name,
      phone,
      role,
      isActive: true,
      specialties: specialties || [],
      experienceYears: experienceYears || 0,
      maxDailyAppointments: maxDailyAppointments || 8,
      walkingPreferences: role === 'pet_walker' ? {
        maxDistance: walkingPreferences?.maxDistance || 5,
        preferredAreas: walkingPreferences?.preferredAreas || [],
        availableTimeSlots: walkingPreferences?.availableTimeSlots || [],
        simultaneousWalks: walkingPreferences?.simultaneousWalks || 1
      } : null,
      appointments: [],
      rating: 0,
      reviews: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await admin.firestore().collection('users').doc(userRecord.uid).set(userData);

    console.log('[STAFF] Successfully created staff member:', { uid: userRecord.uid });
    res.status(201).json({
      message: 'Staff member created successfully',
      uid: userRecord.uid,
      userData
    });

  } catch (error) {
    console.error('[STAFF] Creation error:', error);
    if (error instanceof Error) {
      res.status(500).json({
        message: error.message,
        success: false
      });
    } else {
      res.status(500).json({
        message: 'Unknown error occurred',
        success: false
      });
    }
  }
});

export function registerRoutes(app: Express.Application) {
  try {
    // Mount API routes
    app.use('/api/staff-management', staffManagementRouter);
    app.use('/api', router);

    // Debug: Log all registered routes
    console.log('[ROUTES] Registered routes:');

    const getRoutes = (stack: any[], prefix = '') => {
      return stack
        .filter(r => r.route)
        .map(r => `${Object.keys(r.route.methods).join(',')} ${prefix}${r.route.path}`);
    };

    const routes = [
      ...getRoutes(staffManagementRouter.stack, '/api/staff-management'),
      ...getRoutes(router.stack, '/api')
    ];

    console.log(routes);

    // Add role management routes here.  This assumes a middleware setup to handle requests.  Adjust based on your actual middleware.
    router.get('/roles', async (req: Request, res: Response) => {
      try {
        const firestore = admin.firestore();
        const rolesSnapshot = await firestore.collection('role-definitions').get();

        const roles = rolesSnapshot.docs.map(doc => ({
          name: doc.id,
          ...doc.data()
        }));

        res.json(roles);
      } catch (error) {
        console.error('[ROLES] Error fetching roles:', error);
        res.status(500).json({ message: 'Failed to fetch roles' });
      }
    });

    router.get('/firebase-users', async (req: Request, res: Response) => {
      try {
        const auth = admin.auth();
        const firestore = admin.firestore();
        const { pageToken } = req.query;

        const listUsersResult = await auth.listUsers(1000, pageToken as string);
        const users = await Promise.all(
          listUsersResult.users.map(async (user) => {
            const roleDoc = await firestore.collection('roles').doc(user.uid).get();
            const role = roleDoc.exists ? roleDoc.data()?.role : 'staff';

            return {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              role,
              disabled: user.disabled,
              lastSignInTime: user.metadata.lastSignInTime,
              creationTime: user.metadata.creationTime
            };
          })
        );

        // Set explicit CORS headers for this route
        res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
        res.header('Access-Control-Allow-Credentials', 'true');

        res.json({
          users,
          pageToken: listUsersResult.pageToken
        });
      } catch (error) {
        console.error('[USERS] Error fetching users:', error);
        res.status(500).json({
          error: 'Failed to fetch users',
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'USER_FETCH_ERROR'
        });
      }
    });


    // API 404 handler - must be last
    app.use('/api/*', (req: Request, res: Response) => {
      console.log('[404] Not Found:', req.method, req.url);
      res.status(404).json({
        message: `Route ${req.method} ${req.url} not found`,
        availableRoutes: routes
      });
    });

  } catch (error) {
    console.error('[ROUTES] Error mounting routes:', error);
    throw error;
  }
}