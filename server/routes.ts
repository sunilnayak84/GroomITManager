import { Router, Request, Response } from 'express';
import { auth, db } from './firebase';
import * as admin from 'firebase-admin';
import * as Express from 'express';
import staffManagementRouter from './api/staff-management';

const router = Router();

// Global API request logging middleware
router.use((req, res, next) => {
  console.log('API Request:', {
    method: req.method,
    url: req.url,
    body: req.body,
    baseUrl: req.baseUrl,
    path: req.path
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
      console.log('[STAFF] Validation failed:', { email: !email, name: !name, role: !role, phone: !phone });
      return res.status(400).json({
        message: 'Missing required fields',
        details: { email: !email, name: !name, role: !role, phone: !phone }
      });
    }

    // Validate role
    const validRoles = ['staff', 'groomer', 'pet_walker'];
    if (!validRoles.includes(role)) {
      console.log('[STAFF] Invalid role:', role);
      return res.status(400).json({
        message: 'Invalid role specified',
        validRoles
      });
    }

    console.log('[STAFF] Creating Firebase Auth user');
    // Create Firebase Auth user
    const userRecord = await admin.auth().createUser({
      email,
      password: password || 'Welcome123!',
      displayName: name,
      phoneNumber: phone,
      disabled: false
    });

    console.log('[STAFF] Setting custom claims');
    // Set custom claims based on role
    const claims = {
      role,
      isStaff: true,
      createdAt: new Date().toISOString()
    };

    await admin.auth().setCustomUserClaims(userRecord.uid, claims);

    console.log('[STAFF] Preparing user data for Firestore');
    // Create Firestore user document with role-specific data
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

    console.log('[STAFF] Saving to Firestore');
    // Save to Firestore
    await admin.firestore().collection('users').doc(userRecord.uid).set(userData);

    console.log('[STAFF] Successfully created staff member:', { name, role, uid: userRecord.uid });
    res.status(201).json({
      message: 'Staff member created successfully',
      uid: userRecord.uid
    });

  } catch (error) {
    console.error('[STAFF] Creation error:', error);

    if (error instanceof Error) {
      if (error.message.includes('auth')) {
        return res.status(400).json({
          message: 'Authentication error',
          details: error.message
        });
      }

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
    // Mount API routes with proper prefixes
    app.use('/api/staff-management', staffManagementRouter);
    app.use('/api', router);

    // Log available routes for debugging
    const routesList = [
      ...staffManagementRouter.stack
        .filter((r: any) => r.route)
        .map((r: any) => `${Object.keys(r.route.methods).join(',')} /api/staff-management${r.route.path}`),
      ...router.stack
        .filter((r: any) => r.route)
        .map((r: any) => `${Object.keys(r.route.methods).join(',')} /api${r.route.path}`)
    ];

    console.log('[ROUTES] Available API routes:', routesList);

    // 404 handler for API routes - must be last
    app.use('/api/*', (req: Request, res: Response) => {
      console.log('[404] Not Found:', req.method, req.url);
      res.status(404).json({ 
        message: `Route ${req.method} ${req.url} not found`,
        routes: routesList 
      });
    });

  } catch (error) {
    console.error('[ROUTES] Error mounting routes:', error);
    throw error;
  }
}