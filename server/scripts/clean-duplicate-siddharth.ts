#!/usr/bin/env tsx

/**
 * CLEANUP: Remove duplicate Siddharth entries and ensure proper synchronization
 */

import { getFirebaseAdmin } from '../firebase.js';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from '../utils/logger.js';

class CleanDuplicateSiddharth {
  private db: ReturnType<typeof getFirestore>;

  constructor() {
    const firebaseApp = getFirebaseAdmin();
    if (!firebaseApp) {
      throw new Error('Firebase Admin not initialized');
    }
    this.db = getFirestore(firebaseApp);
  }

  async cleanup(): Promise<void> {
    try {
      logger.info('[CLEAN-DUPLICATE] Starting cleanup process...');

      const oldUID = 'bEWrvBuCjcaS81IPqzBpApXnRyy1';
      const correctUID = 'sQy0fuwNcLMU1J0KwRa9fnTjBPj2';

      // Check if old entry exists
      const oldDoc = await this.db.collection('users').doc(oldUID).get();
      if (oldDoc.exists) {
        const oldData = oldDoc.data();
        logger.info('[CLEAN-DUPLICATE] Found old entry:', {
          uid: oldUID,
          email: oldData?.email,
          name: oldData?.name
        });

        // Delete the old entry
        await this.db.collection('users').doc(oldUID).delete();
        logger.info('[CLEAN-DUPLICATE] Deleted old entry');
      }

      // Ensure correct entry exists with proper data
      const correctDoc = await this.db.collection('users').doc(correctUID).get();
      if (correctDoc.exists) {
        const correctData = correctDoc.data();
        logger.info('[CLEAN-DUPLICATE] Correct entry exists:', {
          uid: correctUID,
          email: correctData?.email,
          name: correctData?.name
        });

        // Update email to lowercase for consistency
        await this.db.collection('users').doc(correctUID).update({
          email: 'siddharth@groomery.in',
          updatedAt: Date.now(),
          cleanupCompleted: true
        });

        logger.info('[CLEAN-DUPLICATE] Updated correct entry with consistent email');
      }

      logger.info('[CLEAN-DUPLICATE] Cleanup completed successfully');

    } catch (error) {
      logger.error('[CLEAN-DUPLICATE] Error during cleanup:', error);
      throw error;
    }
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  const cleanup = new CleanDuplicateSiddharth();
  cleanup.cleanup()
    .then(() => {
      logger.info('[CLEAN-DUPLICATE] Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('[CLEAN-DUPLICATE] Script failed:', error);
      process.exit(1);
    });
}

export { CleanDuplicateSiddharth };