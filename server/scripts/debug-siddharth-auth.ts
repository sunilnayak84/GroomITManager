#!/usr/bin/env tsx

/**
 * DEBUG: Check Siddharth's Firebase Auth status
 */

import { getFirebaseAdmin } from '../firebase.js';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { logger } from '../utils/logger.js';

class DebugSiddharthAuth {
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

  async debug(): Promise<void> {
    try {
      const uid = 'bEWrvBuCjcaS81IPqzBpApXnRyy1';
      const email = 'Siddharth@groomery.in';

      console.log('=== DEBUGGING SIDDHARTH AUTH STATUS ===');
      
      // Check by UID
      try {
        const userByUid = await this.auth.getUser(uid);
        console.log('✅ Found by UID:', {
          uid: userByUid.uid,
          email: userByUid.email,
          displayName: userByUid.displayName,
          emailVerified: userByUid.emailVerified,
          disabled: userByUid.disabled,
          customClaims: userByUid.customClaims
        });
      } catch (error: any) {
        console.log('❌ NOT found by UID:', error.code, error.message);
      }

      // Check by email
      try {
        const userByEmail = await this.auth.getUserByEmail(email);
        console.log('✅ Found by email:', {
          uid: userByEmail.uid,
          email: userByEmail.email,
          displayName: userByEmail.displayName,
          emailVerified: userByEmail.emailVerified,
          disabled: userByEmail.disabled,
          customClaims: userByEmail.customClaims
        });
      } catch (error: any) {
        console.log('❌ NOT found by email:', error.code, error.message);
      }

      // Check Firestore
      try {
        const firestoreUser = await this.db.collection('users').doc(uid).get();
        if (firestoreUser.exists) {
          console.log('✅ Found in Firestore:', {
            uid: firestoreUser.id,
            data: firestoreUser.data()
          });
        } else {
          console.log('❌ NOT found in Firestore');
        }
      } catch (error: any) {
        console.log('❌ Error checking Firestore:', error.message);
      }

      // List all users and search
      console.log('\n=== SEARCHING ALL FIREBASE AUTH USERS ===');
      const allUsers = await this.auth.listUsers(1000);
      
      const foundUsers = allUsers.users.filter(user => 
        user.email?.toLowerCase().includes('siddharth') || 
        user.displayName?.toLowerCase().includes('siddharth') ||
        user.uid === uid
      );

      if (foundUsers.length > 0) {
        console.log('Found matching users:');
        foundUsers.forEach(user => {
          console.log(`  - ${user.email} (${user.uid})`);
        });
      } else {
        console.log('No matching users found in Firebase Auth');
      }

      console.log('\n=== DEBUG COMPLETE ===');
      
    } catch (error) {
      console.error('Debug error:', error);
      throw error;
    }
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  const debug = new DebugSiddharthAuth();
  debug.debug()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Debug failed:', error);
      process.exit(1);
    });
}