/**
 * USER CREATION SYNCHRONIZATION SCRIPT
 * 
 * This script creates a Cloud Function or webhook handler to ensure
 * that when a new user is created in Firebase Auth (via Google Auth),
 * they are automatically added to the Firestore users collection.
 */

import { initializeFirebaseAdmin } from '../firebase.js';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from '../utils/logger.js';

interface NewUserData {
  uid: string;
  email: string | null;
  displayName: string | null;
  provider: string;
  defaultRole?: string;
}

class UserSyncService {
  private auth: any;
  private db: any;

  constructor() {
    const app = initializeFirebaseAdmin();
    this.auth = getAuth(app);
    this.db = getFirestore(app);
  }

  /**
   * Sync a newly created Firebase Auth user to Firestore
   */
  async syncNewUserToFirestore(userData: NewUserData): Promise<void> {
    try {
      logger.info('[USER-SYNC] Syncing new user to Firestore:', userData.email);

      // Determine default role based on email domain or other criteria
      let defaultRole = userData.defaultRole || 'customer';
      
      // Special handling for known domains
      if (userData.email?.endsWith('@groomery.in')) {
        defaultRole = 'staff'; // Internal users default to staff
      }

      // Check if user already exists in Firestore
      const existingUser = await this.db.collection('users').doc(userData.uid).get();
      
      if (existingUser.exists) {
        logger.info('[USER-SYNC] User already exists in Firestore, skipping');
        return;
      }

      // Get default permissions for the role
      const roleDoc = await this.db.collection('role-definitions').doc(defaultRole).get();
      let permissions: string[] = [];
      
      if (roleDoc.exists) {
        permissions = roleDoc.data()?.permissions || [];
      } else {
        // Fallback permissions based on role
        const defaultPermissions: Record<string, string[]> = {
          admin: ['all'],
          manager: ['manage_appointments', 'view_appointments', 'create_appointments', 'manage_customers', 'view_customers'],
          staff: ['view_appointments', 'view_customers', 'view_services', 'view_staff_schedule'],
          receptionist: ['view_appointments', 'create_appointments', 'view_customers', 'create_customers', 'view_services'],
          customer: ['view_own_appointments', 'create_appointments', 'manage_own_pets', 'view_services']
        };
        permissions = defaultPermissions[defaultRole] || defaultPermissions.customer;
      }

      // Create user document in Firestore
      const userDocument = {
        email: userData.email,
        displayName: userData.displayName || userData.email?.split('@')[0] || 'Unknown User',
        role: defaultRole,
        permissions: permissions,
        provider: userData.provider,
        disabled: false,
        emailVerified: false, // Will be updated when user verifies email
        createdAt: new Date().toISOString(),
        lastSignInTime: null,
        syncedFromAuth: true,
        syncedAt: new Date().toISOString()
      };

      await this.db.collection('users').doc(userData.uid).set(userDocument);

      // Set custom claims for the user
      await this.auth.setCustomUserClaims(userData.uid, {
        role: defaultRole,
        permissions: permissions,
        isAdmin: defaultRole === 'admin',
        updatedAt: Date.now(),
        autoSynced: true
      });

      logger.info('[USER-SYNC] Successfully synced new user:', {
        uid: userData.uid,
        email: userData.email,
        role: defaultRole,
        permissions: permissions.length
      });

    } catch (error) {
      logger.error('[USER-SYNC] Error syncing new user:', error);
      throw error;
    }
  }

  /**
   * Webhook handler for Firebase Auth user creation events
   */
  async handleUserCreationWebhook(event: any): Promise<void> {
    try {
      const userData: NewUserData = {
        uid: event.uid,
        email: event.email,
        displayName: event.displayName,
        provider: event.providerData?.[0]?.providerId || 'password'
      };

      await this.syncNewUserToFirestore(userData);
    } catch (error) {
      logger.error('[USER-SYNC] Webhook handler error:', error);
      throw error;
    }
  }

  /**
   * Manual sync for existing users who might be missing from Firestore
   */
  async syncAllMissingUsers(): Promise<void> {
    try {
      logger.info('[USER-SYNC] Starting manual sync of all missing users...');

      // Get all Firebase Auth users
      const authResult = await this.auth.listUsers(1000);
      
      // Get all Firestore users
      const usersSnapshot = await this.db.collection('users').get();
      const firestoreUserIds = new Set(usersSnapshot.docs.map(doc => doc.id));

      // Find missing users
      const missingUsers = authResult.users.filter((user: any) => 
        !firestoreUserIds.has(user.uid)
      );

      logger.info('[USER-SYNC] Found missing users:', missingUsers.length);

      // Sync each missing user
      for (const user of missingUsers) {
        const userData: NewUserData = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          provider: user.providerData?.[0]?.providerId || 'password'
        };

        await this.syncNewUserToFirestore(userData);
        
        // Small delay to avoid overwhelming Firestore
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      logger.info('[USER-SYNC] Manual sync completed successfully');
    } catch (error) {
      logger.error('[USER-SYNC] Manual sync error:', error);
      throw error;
    }
  }
}

// Export for use in other modules
export { UserSyncService };

// Run manual sync if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const syncService = new UserSyncService();
  syncService.syncAllMissingUsers()
    .then(() => {
      logger.info('[USER-SYNC] Manual sync script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('[USER-SYNC] Manual sync script failed:', error);
      process.exit(1);
    });
}