import { Router, Request, Response } from 'express';
import { auth, db } from './firebase';
import * as admin from 'firebase-admin';
import * as Express from 'express';

const router = Router();

// Request logging middleware (unchanged from original)
router.use((req, res, next) => {
  console.log('API Request:', {
    method: req.method,
    url: req.url,
    body: req.body,
    path: req.path,
    baseUrl: req.baseUrl
  });
  next();
});

// Staff creation endpoint (replaced with edited code)
router.post('/staff/create', async (req: Request, res: Response) => {
  console.log('Received staff creation request:', req.body);

  try {
    const { email, password, name, role, phone, specialties, experienceYears, maxDailyAppointments, walkingPreferences } = req.body;

    // Input validation
    if (!email || !name || !role || !phone) {
      return res.status(400).json({
        message: 'Missing required fields',
        details: { email: !email, name: !name, role: !role, phone: !phone }
      });
    }

    // Validate role
    const validRoles = ['staff', 'groomer', 'pet_walker'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        message: 'Invalid role specified',
        validRoles
      });
    }

    // Create Firebase Auth user
    const userRecord = await admin.auth().createUser({
      email,
      password: password || 'Welcome123!', // Default password if not provided
      displayName: name,
      phoneNumber: phone,
      disabled: false
    });

    // Set custom claims based on role
    const claims = {
      role,
      isStaff: true,
      createdAt: new Date().toISOString()
    };

    await admin.auth().setCustomUserClaims(userRecord.uid, claims);

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

    // Save to Firestore
    await admin.firestore().collection('users').doc(userRecord.uid).set(userData);

    console.log(`Successfully created staff member ${name} with role ${role}`);
    res.status(201).json({
      message: 'Staff member created successfully',
      uid: userRecord.uid
    });

  } catch (error) {
    console.error('Staff creation error:', error);

    if (error instanceof Error) {
      // Handle specific Firebase Auth errors
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

export const registerRoutes = (app: Express.Application) => {
  // Mount routes under /api
  app.use('/api', router);

  // Log registered routes
  console.log('Available API routes:', 
    router.stack
      .filter((r: any) => r.route)
      .map((r: any) => `${Object.keys(r.route.methods).join(',')} ${r.route.path}`)
  );

  // API 404 handler
  app.use('/api/*', (req: Request, res: Response) => {
    console.log('404 Not Found:', req.method, req.url);
    res.status(404).json({ message: `Route ${req.method} ${req.url} not found` });
  });
};