#!/usr/bin/env tsx

/**
 * CREATE: Firebase Auth User for Siddharth
 * 
 * This script creates a proper Firebase Auth user for Siddharth Basodiya
 * with the correct email and UID matching the Firestore data.
 */

import { getFirebaseAdmin } from '../firebase.js';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { logger } from '../utils/logger.js';

class CreateSiddharthAuthUser {
  private auth: ReturnType<typeof getAuth>;
  private db: ReturnType<typeof getFirestore>;

  constructor() {
    const firebaseApp = getFirebaseAdmin();
    if (!firebaseApp) {
      throw new Error('Firebase Admin not initialized');
    }
    this.auth = getAuth(firebaseApp);
    this.db = getFirestore(firebaseApp);
  }

  async createAuthUser(): Promise<void> {
    try {
      logger.info('[CREATE-SIDDHARTH-AUTH] Starting Firebase Auth user creation...');

      // Get the corrected Firestore data
      const firestoreUserDoc = await this.db.collection('users').doc('sQy0fuwNcLMU1J0KwRa9fnTjBPj2').get();
      
      if (!firestoreUserDoc.exists) {
        logger.error('[CREATE-SIDDHARTH-AUTH] No Firestore user data found for Siddharth');
        return;
      }

      const userData = firestoreUserDoc.data();
      logger.info('[CREATE-SIDDHARTH-AUTH] Found Firestore data:', {
        email: userData?.email,
        name: userData?.name,
        role: userData?.role
      });

      // Check if Auth user already exists
      try {
        const existingUser = await this.auth.getUserByEmail(userData?.email || 'siddharth@groomery.in');
        logger.info('[CREATE-SIDDHARTH-AUTH] Auth user already exists:', {
          uid: existingUser.uid,
          email: existingUser.email
        });
        
        // Just set custom claims if user exists
        await this.setCustomClaims(existingUser.uid, userData);
        return;
      } catch (error: any) {
        if (error.code !== 'auth/user-not-found') {
          throw error;
        }
        // User doesn't exist, create it
      }

      // Create new Firebase Auth user
      const phoneNumber = userData?.phone ? `+91${userData.phone.replace(/^\+91/, '')}` : undefined;
      const newUser = await this.auth.createUser({
        uid: 'sQy0fuwNcLMU1J0KwRa9fnTjBPj2',
        email: userData?.email || 'siddharth@groomery.in',
        displayName: userData?.name || 'Siddharth Basodiya',
        emailVerified: false,
        disabled: false,
        phoneNumber: phoneNumber
      });

      logger.info('[CREATE-SIDDHARTH-AUTH] Created Firebase Auth user:', {
        uid: newUser.uid,
        email: newUser.email,
        displayName: newUser.displayName
      });

      // Set custom claims
      await this.setCustomClaims(newUser.uid, userData);

      logger.info('[CREATE-SIDDHARTH-AUTH] Firebase Auth user creation completed successfully');

    } catch (error) {
      logger.error('[CREATE-SIDDHARTH-AUTH] Error creating Auth user:', error);
      throw error;
    }
  }

  private async setCustomClaims(uid: string, userData: any): Promise<void> {
    const customClaims = {
      role: userData?.role || 'staff',
      permissions: userData?.permissions || [
        'view_appointments',
        'create_appointments',
        'view_customers',
        'create_customers',
        'view_services'
      ],
      isAdmin: false,
      updatedAt: Date.now(),
      permissionsSynced: true,
      authUserCreated: true
    };

    await this.auth.setCustomUserClaims(uid, customClaims);
    logger.info('[CREATE-SIDDHARTH-AUTH] Set custom claims:', {
      uid,
      role: customClaims.role,
      permissions: customClaims.permissions.length
    });
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  const creator = new CreateSiddharthAuthUser();
  creator.createAuthUser()
    .then(() => {
      logger.info('[CREATE-SIDDHARTH-AUTH] Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('[CREATE-SIDDHARTH-AUTH] Script failed:', error);
      process.exit(1);
    });
}

export { CreateSiddharthAuthUser };