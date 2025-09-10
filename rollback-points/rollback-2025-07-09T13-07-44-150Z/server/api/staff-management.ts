import { Router, Request, Response } from 'express';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from '../utils/logger.js';

// Create and export the router
export const staffManagementRouter = Router();

// Request logging middleware specific to staff management
staffManagementRouter.use((req, res, next) => {
  logger.info('[STAFF-MGMT] Incoming request:', {
    method: req.method,
    path: req.path,
    body: req.body
  });
  next();
});

// Create staff member endpoint
staffManagementRouter.post('/create', async (req: Request, res: Response) => {
  logger.info('[STAFF-MGMT] Creation request received:', req.body);

  try {
    const {
      email,
      password,
      name,
      role,
      phone,
      specialties = [],
      experienceYears = 0,
      maxDailyAppointments = 8,
      walkingPreferences = null
    } = req.body;

    // Input validation
    if (!email || !name || !role || !phone) {
      logger.warn('[STAFF-MGMT] Missing required fields:', { email: !email, name: !name, role: !role, phone: !phone });
      return res.status(400).json({
        message: 'Missing required fields',
        details: { email: !email, name: !name, role: !role, phone: !phone }
      });
    }

    // Create user in Firebase Auth
    logger.info('[STAFF-MGMT] Creating Firebase Auth user');
    const auth = getAuth();
    const userRecord = await auth.createUser({
      email,
      password: password || 'Welcome123!', // Default password
      displayName: name,
      phoneNumber: phone.startsWith('+') ? phone : `+91${phone}`, // Ensure phone number has country code
      disabled: false
    });

    // Set custom claims for role-based access
    logger.info('[STAFF-MGMT] Setting custom claims');
    const claims = {
      role,
      isStaff: true,
      createdAt: new Date().toISOString()
    };
    await auth.setCustomUserClaims(userRecord.uid, claims);

    // Prepare user document for Firestore
    logger.info('[STAFF-MGMT] Preparing user data');
    const userData = {
      id: userRecord.uid,
      email,
      name,
      phone,
      role,
      isActive: true,
      specialties,
      experienceYears,
      maxDailyAppointments,
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
    logger.info('[STAFF-MGMT] Saving to Firestore');
    const db = getFirestore();
    await db.collection('users').doc(userRecord.uid).set(userData);

    logger.info('[STAFF-MGMT] Successfully created staff member:', { name, role, uid: userRecord.uid });
    res.status(201).json({
      message: 'Staff member created successfully',
      uid: userRecord.uid,
      userData
    });

  } catch (error) {
    logger.error('[STAFF-MGMT] Error creating staff:', error);

    if (error instanceof Error) {
      if (error.message.includes('auth/email-already-exists')) {
        return res.status(400).json({
          message: 'Email already exists',
          details: error.message
        });
      }

      if (error.message.includes('auth/invalid-phone-number')) {
        return res.status(400).json({
          message: 'Invalid phone number format',
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

export default staffManagementRouter;