#!/usr/bin/env tsx

/**
 * CREATE: Firestore entry for test.groomer@example.com
 * 
 * This script creates a proper Firestore entry for the test groomer user
 * to complete the synchronization between Firebase Auth and Firestore.
 */

import { getFirebaseAdmin } from '../firebase.js';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { logger } from '../utils/logger.js';

class CreateTestGroomerFirestore {
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

  async createFirestoreEntry(): Promise<void> {
    try {
      const uid = 'bEWrvBuCjcaS81IPqzBpApXnRyy1';
      
      logger.info('[CREATE-TEST-GROOMER] Creating Firestore entry for test.groomer@example.com...');

      // Get the Firebase Auth user data
      const authUser = await this.auth.getUser(uid);
      
      logger.info('[CREATE-TEST-GROOMER] Found Firebase Auth user:', {
        uid: authUser.uid,
        email: authUser.email,
        displayName: authUser.displayName,
        customClaims: authUser.customClaims
      });

      // Check if Firestore entry already exists
      const firestoreDoc = await this.db.collection('users').doc(uid).get();
      if (firestoreDoc.exists) {
        logger.info('[CREATE-TEST-GROOMER] Firestore entry already exists');
        return;
      }

      // Create the Firestore entry
      const userData = {
        uid: uid,
        email: authUser.email,
        displayName: authUser.displayName || 'Test Groomer',
        name: authUser.displayName || 'Test Groomer',
        role: authUser.customClaims?.role || 'receptionist',
        permissions: authUser.customClaims?.permissions || [
          'view_appointments',
          'create_appointments',
          'view_customers',
          'create_customers',
          'view_services'
        ],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: Date.now(),
        isGroomer: false,
        branch: 'main',
        schedule: [],
        maxDailyAppointments: 8,
        specialties: ['receptionist'],
        experienceYears: 0,
        metadata: {},
        firestoreCreated: true,
        createdBy: 'system-sync'
      };

      await this.db.collection('users').doc(uid).set(userData);
      
      logger.info('[CREATE-TEST-GROOMER] Created Firestore entry successfully:', {
        uid: uid,
        email: userData.email,
        role: userData.role
      });

      logger.info('[CREATE-TEST-GROOMER] Firestore entry creation completed');

    } catch (error) {
      logger.error('[CREATE-TEST-GROOMER] Error creating Firestore entry:', error);
      throw error;
    }
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  const creator = new CreateTestGroomerFirestore();
  creator.createFirestoreEntry()
    .then(() => {
      logger.info('[CREATE-TEST-GROOMER] Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('[CREATE-TEST-GROOMER] Script failed:', error);
      process.exit(1);
    });
}

export { CreateTestGroomerFirestore };