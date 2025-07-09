#!/usr/bin/env tsx

/**
 * ONE-TIME FIX: Create Firebase Auth User for Siddharth Basodiya
 * 
 * This script creates a Firebase Auth user for Siddharth Basodiya who exists
 * in the Firestore users collection but not in Firebase Auth.
 */

import { getFirebaseAdmin } from '../firebase.js';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { logger } from '../utils/logger.js';

interface FirestoreUser {
  uid: string;
  email: string;
  displayName?: string;
  role: string;
  createdAt?: any;
  phoneNumber?: string;
}

class CreateMissingAuthUser {
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

  async findSiddharthInFirestore(): Promise<FirestoreUser | null> {
    try {
      logger.info('[CREATE-AUTH-USER] Searching for Siddharth Basodiya in Firestore...');
      
      const usersSnapshot = await this.db.collection('users').get();
      const users: FirestoreUser[] = [];

      usersSnapshot.forEach(doc => {
        const userData = doc.data() as FirestoreUser;
        users.push({
          ...userData,
          uid: doc.id
        });
      });

      // Search for Siddharth
      const siddharthUser = users.find(user => 
        user.displayName?.toLowerCase().includes('siddharth') ||
        user.email?.toLowerCase().includes('siddharth') ||
        user.displayName?.toLowerCase().includes('basodiya')
      );

      if (siddharthUser) {
        logger.info('[CREATE-AUTH-USER] Found Siddharth in Firestore:', {
          uid: siddharthUser.uid,
          email: siddharthUser.email,
          displayName: siddharthUser.displayName,
          role: siddharthUser.role
        });
        return siddharthUser;
      }

      logger.info('[CREATE-AUTH-USER] Siddharth not found in Firestore');
      return null;
    } catch (error) {
      logger.error('[CREATE-AUTH-USER] Error searching Firestore:', error);
      throw error;
    }
  }

  async checkAuthUserExists(uid: string): Promise<boolean> {
    try {
      await this.auth.getUser(uid);
      return true;
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        return false;
      }
      throw error;
    }
  }

  async checkAuthUserExistsByEmail(email: string): Promise<boolean> {
    try {
      await this.auth.getUserByEmail(email);
      return true;
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        return false;
      }
      throw error;
    }
  }

  async createAuthUser(userData: FirestoreUser): Promise<void> {
    try {
      logger.info('[CREATE-AUTH-USER] Creating Firebase Auth user for Siddharth...');

      // Create the user in Firebase Auth
      const userRecord = await this.auth.createUser({
        uid: userData.uid,
        email: userData.email,
        displayName: userData.displayName || 'Siddharth Basodiya',
        emailVerified: false,
        disabled: false,
        phoneNumber: userData.phoneNumber || undefined
      });

      logger.info('[CREATE-AUTH-USER] Firebase Auth user created:', {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName
      });

      // Set custom claims for role and permissions
      const customClaims = {
        role: userData.role,
        permissions: this.getPermissionsForRole(userData.role),
        isAdmin: userData.role === 'admin',
        updatedAt: Date.now(),
        authUserCreated: true
      };

      await this.auth.setCustomUserClaims(userData.uid, customClaims);

      logger.info('[CREATE-AUTH-USER] Custom claims set successfully:', {
        uid: userData.uid,
        role: userData.role,
        permissions: customClaims.permissions.length
      });

    } catch (error) {
      logger.error('[CREATE-AUTH-USER] Error creating Firebase Auth user:', error);
      throw error;
    }
  }

  private getPermissionsForRole(role: string): string[] {
    // Default permissions based on role
    const rolePermissions: Record<string, string[]> = {
      admin: [
        'manage_appointments', 'view_appointments', 'create_appointments', 'cancel_appointments',
        'manage_customers', 'view_customers', 'create_customers', 'edit_customer_info',
        'manage_services', 'view_services', 'create_services', 'edit_services',
        'manage_inventory', 'view_inventory', 'update_stock', 'manage_consumables',
        'manage_staff_schedule', 'view_staff_schedule', 'manage_own_schedule',
        'view_analytics', 'view_reports', 'view_financial_reports', 'all'
      ],
      manager: [
        'manage_appointments', 'view_appointments', 'create_appointments',
        'manage_customers', 'view_customers', 'create_customers', 'edit_customer_info',
        'manage_services', 'view_services', 'manage_inventory', 'view_inventory',
        'view_staff_schedule', 'manage_own_schedule', 'view_reports'
      ],
      staff: [
        'view_appointments', 'create_appointments', 'view_customers',
        'view_services', 'view_inventory', 'manage_own_schedule'
      ],
      receptionist: [
        'view_appointments', 'create_appointments', 'view_customers',
        'create_customers', 'view_services'
      ]
    };

    return rolePermissions[role] || rolePermissions.staff;
  }

  async run(): Promise<void> {
    try {
      logger.info('[CREATE-AUTH-USER] Starting one-time fix for Siddharth Basodiya...');

      // Step 1: Find Siddharth in Firestore
      const siddharthData = await this.findSiddharthInFirestore();
      
      if (!siddharthData) {
        logger.error('[CREATE-AUTH-USER] Siddharth Basodiya not found in Firestore users collection');
        return;
      }

      // Step 2: Check if Auth user already exists (by UID or email)
      const authUserExistsByUid = await this.checkAuthUserExists(siddharthData.uid);
      const authUserExistsByEmail = await this.checkAuthUserExistsByEmail(siddharthData.email);
      
      if (authUserExistsByUid || authUserExistsByEmail) {
        logger.info('[CREATE-AUTH-USER] Firebase Auth user already exists for Siddharth', {
          existsByUid: authUserExistsByUid,
          existsByEmail: authUserExistsByEmail
        });
        return;
      }

      // Step 3: Create the Firebase Auth user
      await this.createAuthUser(siddharthData);

      logger.info('[CREATE-AUTH-USER] One-time fix completed successfully for Siddharth Basodiya');

    } catch (error) {
      logger.error('[CREATE-AUTH-USER] One-time fix failed:', error);
      throw error;
    }
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  const createAuthUser = new CreateMissingAuthUser();
  createAuthUser.run()
    .then(() => {
      logger.info('[CREATE-AUTH-USER] Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('[CREATE-AUTH-USER] Script failed:', error);
      process.exit(1);
    });
}

export { CreateMissingAuthUser };