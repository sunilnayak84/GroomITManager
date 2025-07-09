#!/usr/bin/env tsx

/**
 * USER AUDIT REPORT
 * 
 * This script generates a comprehensive report showing all users
 * in both Firebase Auth and Firestore collections.
 */

import { getFirebaseAdmin } from '../firebase.js';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { logger } from '../utils/logger.js';

class UserAuditReport {
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

  async generateReport(): Promise<void> {
    try {
      logger.info('[USER-AUDIT] Starting comprehensive user audit...');

      // Get all Firebase Auth users
      const authResult = await this.auth.listUsers(1000);
      const authUsers = authResult.users;

      // Get all Firestore users
      const usersSnapshot = await this.db.collection('users').get();
      const firestoreUsers: any[] = [];

      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        firestoreUsers.push({
          uid: doc.id,
          ...userData
        });
      });

      // Create report
      console.log('\n=== USER AUDIT REPORT ===');
      console.log(`Firebase Auth Users: ${authUsers.length}`);
      console.log(`Firestore Users: ${firestoreUsers.length}`);
      console.log('\n=== FIREBASE AUTH USERS ===');
      
      authUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email} (uid: ${user.uid})`);
        console.log(`   - Display Name: ${user.displayName || 'N/A'}`);
        console.log(`   - Email Verified: ${user.emailVerified}`);
        console.log(`   - Disabled: ${user.disabled}`);
        console.log(`   - Created: ${user.metadata.creationTime}`);
        console.log(`   - Last Sign In: ${user.metadata.lastSignInTime || 'Never'}`);
        console.log(`   - Custom Claims: ${JSON.stringify(user.customClaims || {})}`);
        console.log('');
      });

      console.log('\n=== FIRESTORE USERS ===');
      
      firestoreUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email} (uid: ${user.uid})`);
        console.log(`   - Display Name: ${user.displayName || 'N/A'}`);
        console.log(`   - Role: ${user.role || 'N/A'}`);
        console.log(`   - Phone: ${user.phoneNumber || 'N/A'}`);
        console.log(`   - Created: ${user.createdAt || 'N/A'}`);
        console.log(`   - Updated: ${user.updatedAt || 'N/A'}`);
        console.log('');
      });

      // Check for mismatches
      console.log('\n=== SYNC STATUS CHECK ===');
      
      const authUserIds = new Set(authUsers.map(u => u.uid));
      const firestoreUserIds = new Set(firestoreUsers.map(u => u.uid));
      
      const authOnly = authUsers.filter(u => !firestoreUserIds.has(u.uid));
      const firestoreOnly = firestoreUsers.filter(u => !authUserIds.has(u.uid));
      
      if (authOnly.length > 0) {
        console.log('⚠️  Users in Firebase Auth but NOT in Firestore:');
        authOnly.forEach(user => {
          console.log(`   - ${user.email} (uid: ${user.uid})`);
        });
      }
      
      if (firestoreOnly.length > 0) {
        console.log('⚠️  Users in Firestore but NOT in Firebase Auth:');
        firestoreOnly.forEach(user => {
          console.log(`   - ${user.email} (uid: ${user.uid})`);
        });
      }
      
      if (authOnly.length === 0 && firestoreOnly.length === 0) {
        console.log('✅ All users are properly synchronized between Firebase Auth and Firestore');
      }

      // Check for Siddharth specifically
      console.log('\n=== SIDDHARTH BASODIYA CHECK ===');
      
      const siddharthAuth = authUsers.find(u => 
        u.email?.toLowerCase().includes('siddharth') || 
        u.displayName?.toLowerCase().includes('siddharth')
      );
      
      const siddharthFirestore = firestoreUsers.find(u => 
        u.email?.toLowerCase().includes('siddharth') || 
        u.displayName?.toLowerCase().includes('siddharth')
      );

      if (siddharthAuth) {
        console.log('✅ Siddharth found in Firebase Auth:');
        console.log(`   - Email: ${siddharthAuth.email}`);
        console.log(`   - UID: ${siddharthAuth.uid}`);
        console.log(`   - Display Name: ${siddharthAuth.displayName}`);
        console.log(`   - Custom Claims: ${JSON.stringify(siddharthAuth.customClaims || {})}`);
      } else {
        console.log('❌ Siddharth NOT found in Firebase Auth');
      }

      if (siddharthFirestore) {
        console.log('✅ Siddharth found in Firestore:');
        console.log(`   - Email: ${siddharthFirestore.email}`);
        console.log(`   - UID: ${siddharthFirestore.uid}`);
        console.log(`   - Display Name: ${siddharthFirestore.displayName}`);
        console.log(`   - Role: ${siddharthFirestore.role}`);
      } else {
        console.log('❌ Siddharth NOT found in Firestore');
      }

      console.log('\n=== AUDIT COMPLETE ===');
      
      logger.info('[USER-AUDIT] Audit report generated successfully');

    } catch (error) {
      logger.error('[USER-AUDIT] Error generating audit report:', error);
      throw error;
    }
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  const audit = new UserAuditReport();
  audit.generateReport()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      logger.error('[USER-AUDIT] Audit failed:', error);
      process.exit(1);
    });
}

export { UserAuditReport };