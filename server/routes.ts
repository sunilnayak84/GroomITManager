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

// Role management endpoints
router.get('/roles', async (req: Request, res: Response) => {
  try {
    const firestore = admin.firestore();
    const rolesSnapshot = await firestore.collection('role-definitions').get();

    const roles = rolesSnapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.id,
      ...doc.data()
    }));

    res.json(roles);
  } catch (error) {
    console.error('[ROLES] Error fetching roles:', error);
    res.status(500).json({ 
      error: 'Failed to fetch roles',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/users', async (req: Request, res: Response) => {
  try {
    const { pageToken } = req.query;
    const auth = admin.auth();
    const firestore = admin.firestore();

    const listUsersResult = await auth.listUsers(1000, pageToken as string);
    const users = await Promise.all(
      listUsersResult.users.map(async (user) => {
        const userDoc = await firestore.collection('users').doc(user.uid).get();
        const userData = userDoc.data();

        return {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          role: userData?.role || 'user',
          disabled: user.disabled,
          lastSignInTime: user.metadata.lastSignInTime,
          creationTime: user.metadata.creationTime
        };
      })
    );

    res.json({
      users,
      pageToken: listUsersResult.pageToken
    });
  } catch (error) {
    console.error('[USERS] Error fetching users:', error);
    res.status(500).json({ 
      error: 'Failed to fetch users',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/users/:userId/role', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!userId || !role) {
      return res.status(400).json({ error: 'Missing userId or role' });
    }

    const firestore = admin.firestore();
    const auth = admin.auth();

    // Update Firestore
    await firestore.collection('users').doc(userId).set({
      role,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    // Update custom claims
    await auth.setCustomUserClaims(userId, { role });

    res.json({ message: 'Role updated successfully' });
  } catch (error) {
    console.error('[USERS] Error updating user role:', error);
    res.status(500).json({ 
      error: 'Failed to update user role',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Register routes
export function registerRoutes(app: Express.Application) {
  app.use('/api/staff-management', staffManagementRouter);
  app.use('/api', router);

  // API 404 handler
  app.use('/api/*', (req: Request, res: Response) => {
    res.status(404).json({
      message: `Route ${req.method} ${req.url} not found`
    });
  });
}