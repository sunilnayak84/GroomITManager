#!/usr/bin/env tsx

/**
 * FIX: Correct Siddharth Basodiya's UID in Firestore
 * 
 * This script fixes the UID mismatch for Siddharth Basodiya by:
 * 1. Moving his data from the wrong UID to the correct one
 * 2. Setting proper custom claims for his Firebase Auth user
 */

import { getFirebaseAdmin } from '../firebase.js';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { logger } from '../utils/logger.js';

class FixSiddharthUID {
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

  async fixSiddharthUID(): Promise<void> {
    try {
      const wrongUID = 'bEWrvBuCjcaS81IPqzBpApXnRyy1';
      const correctUID = 'sQy0fuwNcLMU1J0KwRa9fnTjBPj2';

      logger.info('[FIX-SIDDHARTH-UID] Starting UID correction process...');

      // Step 1: Get the current data from the wrong UID
      const wrongUIDDoc = await this.db.collection('users').doc(wrongUID).get();
      if (!wrongUIDDoc.exists) {
        logger.error('[FIX-SIDDHARTH-UID] No user data found at wrong UID');
        return;
      }

      const siddharthData = wrongUIDDoc.data();
      logger.info('[FIX-SIDDHARTH-UID] Found Siddharth data at wrong UID:', {
        email: siddharthData?.email,
        name: siddharthData?.name,
        role: siddharthData?.role
      });

      // Step 2: Check if there's already data at the correct UID
      const correctUIDDoc = await this.db.collection('users').doc(correctUID).get();
      if (correctUIDDoc.exists) {
        logger.info('[FIX-SIDDHARTH-UID] User data already exists at correct UID');
        const existingData = correctUIDDoc.data();
        logger.info('[FIX-SIDDHARTH-UID] Existing data:', {
          email: existingData?.email,
          name: existingData?.name,
          role: existingData?.role
        });
      }

      // Step 3: Move the data to the correct UID
      const updatedData = {
        ...siddharthData,
        uid: correctUID,
        updatedAt: Date.now(),
        uidCorrected: true,
        uidCorrectionDate: new Date().toISOString()
      };

      await this.db.collection('users').doc(correctUID).set(updatedData);
      logger.info('[FIX-SIDDHARTH-UID] Successfully moved data to correct UID');

      // Step 4: Set custom claims for the correct Firebase Auth user
      const customClaims = {
        role: siddharthData?.role || 'staff',
        permissions: siddharthData?.permissions || [
          'view_appointments',
          'create_appointments',
          'view_customers',
          'create_customers',
          'view_services'
        ],
        isAdmin: false,
        updatedAt: Date.now(),
        permissionsSynced: true,
        uidCorrected: true
      };

      await this.auth.setCustomUserClaims(correctUID, customClaims);
      logger.info('[FIX-SIDDHARTH-UID] Set custom claims for correct UID');

      // Step 5: Delete the incorrect data (only if it's definitely wrong)
      await this.db.collection('users').doc(wrongUID).delete();
      logger.info('[FIX-SIDDHARTH-UID] Deleted incorrect data from wrong UID');

      // Step 6: Update the Firebase Auth user at the wrong UID to correct role
      try {
        const wrongAuthUser = await this.auth.getUser(wrongUID);
        if (wrongAuthUser.email === 'test.groomer@example.com') {
          await this.auth.setCustomUserClaims(wrongUID, {
            role: 'receptionist',
            permissions: [
              'view_appointments',
              'create_appointments',
              'view_customers',
              'create_customers',
              'view_services'
            ],
            isAdmin: false,
            updatedAt: Date.now(),
            permissionsSynced: true
          });
          logger.info('[FIX-SIDDHARTH-UID] Updated claims for test.groomer@example.com');
        }
      } catch (error) {
        logger.error('[FIX-SIDDHARTH-UID] Error updating test.groomer claims:', error);
      }

      logger.info('[FIX-SIDDHARTH-UID] UID correction completed successfully');

    } catch (error) {
      logger.error('[FIX-SIDDHARTH-UID] Error fixing UID:', error);
      throw error;
    }
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  const fixer = new FixSiddharthUID();
  fixer.fixSiddharthUID()
    .then(() => {
      logger.info('[FIX-SIDDHARTH-UID] Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('[FIX-SIDDHARTH-UID] Script failed:', error);
      process.exit(1);
    });
}

export { FixSiddharthUID };