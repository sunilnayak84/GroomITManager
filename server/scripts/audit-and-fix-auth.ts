/**
 * COMPREHENSIVE AUTHENTICATION AND ROLE MANAGEMENT AUDIT & FIX
 * 
 * This script performs a complete audit and fix of:
 * 1. Firebase Auth users vs Firestore users collection sync
 * 2. Role definitions and collections cleanup
 * 3. Permission consistency
 * 4. Data structure standardization
 */

import { initializeFirebaseAdmin } from '../firebase.js';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from '../utils/logger.js';

interface FirebaseAuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  disabled: boolean;
  emailVerified: boolean;
  customClaims: Record<string, any>;
  lastSignInTime: string | null;
  createdAt: string | null;
}

interface FirestoreUser {
  uid: string;
  email?: string;
  role?: string;
  permissions?: string[];
  [key: string]: any;
}

interface RoleInconsistency {
  uid: string;
  email: string | null;
  authRole: string;
  firestoreRole: string;
}

interface UserAuditResult {
  firebaseAuthUsers: FirebaseAuthUser[];
  firestoreUsers: FirestoreUser[];
  missingInFirestore: FirebaseAuthUser[];
  missingInAuth: FirestoreUser[];
  roleInconsistencies: RoleInconsistency[];
}

interface CollectionData {
  id: string;
  [key: string]: any;
}

interface CollectionAuditResult {
  collections: string[];
  roleDefinitions: CollectionData[];
  rolesCollection: CollectionData[];
  userRoleData: CollectionData[];
}

class AuthRoleAuditor {
  private auth: any;
  private db: any;

  constructor() {
    const app = initializeFirebaseAdmin();
    this.auth = getAuth(app);
    this.db = getFirestore(app);
  }

  async auditUsers(): Promise<UserAuditResult> {
    logger.info('[AUDIT] Starting user audit...');

    // Get all Firebase Auth users
    const authResult = await this.auth.listUsers(1000);
    const firebaseAuthUsers: FirebaseAuthUser[] = authResult.users.map((user: any) => ({
      uid: user.uid,
      email: user.email || null,
      displayName: user.displayName || null,
      disabled: user.disabled || false,
      emailVerified: user.emailVerified || false,
      customClaims: user.customClaims || {},
      lastSignInTime: user.metadata.lastSignInTime || null,
      createdAt: user.metadata.creationTime || null
    }));

    // Get all Firestore users
    const usersSnapshot = await this.db.collection('users').get();
    const firestoreUsers: FirestoreUser[] = usersSnapshot.docs.map((doc: any) => ({
      uid: doc.id,
      ...doc.data()
    }));

    // Find missing users
    const missingInFirestore = firebaseAuthUsers.filter((authUser: FirebaseAuthUser) => 
      !firestoreUsers.find((fsUser: FirestoreUser) => fsUser.uid === authUser.uid)
    );

    const missingInAuth = firestoreUsers.filter((fsUser: FirestoreUser) => 
      !firebaseAuthUsers.find((authUser: FirebaseAuthUser) => authUser.uid === fsUser.uid)
    );

    // Find role inconsistencies
    const roleInconsistencies: RoleInconsistency[] = firebaseAuthUsers
      .filter((authUser: FirebaseAuthUser) => {
        const fsUser = firestoreUsers.find((fs: FirestoreUser) => fs.uid === authUser.uid);
        return fsUser && (
          authUser.customClaims.role !== fsUser.role ||
          (!authUser.customClaims.role && fsUser.role)
        );
      })
      .map((authUser: FirebaseAuthUser) => {
        const fsUser = firestoreUsers.find((fs: FirestoreUser) => fs.uid === authUser.uid);
        return {
          uid: authUser.uid,
          email: authUser.email,
          authRole: authUser.customClaims.role || 'none',
          firestoreRole: fsUser?.role || 'none'
        };
      });

    return {
      firebaseAuthUsers,
      firestoreUsers,
      missingInFirestore,
      missingInAuth,
      roleInconsistencies
    };
  }

  async auditCollections(): Promise<CollectionAuditResult> {
    logger.info('[AUDIT] Starting collections audit...');

    // List all collections
    const collections = await this.db.listCollections();
    const collectionNames = collections.map((col: any) => col.id);

    // Check role-related collections
    const roleDefinitions = await this.getCollectionData('role-definitions');
    const rolesCollection = await this.getCollectionData('roles');
    const userRoleData = await this.getCollectionData('user-roles');

    return {
      collections: collectionNames,
      roleDefinitions,
      rolesCollection,
      userRoleData
    };
  }

  private async getCollectionData(collectionName: string): Promise<CollectionData[]> {
    try {
      const snapshot = await this.db.collection(collectionName).get();
      return snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      logger.warn(`[AUDIT] Collection ${collectionName} not found or error:`, error);
      return [];
    }
  }

  async fixUserSync(auditResult: UserAuditResult): Promise<void> {
    logger.info('[FIX] Starting user synchronization...');

    // Add missing users to Firestore
    for (const authUser of auditResult.missingInFirestore) {
      const userData = {
        email: authUser.email,
        displayName: authUser.displayName || authUser.email?.split('@')[0] || 'Unknown User',
        role: authUser.customClaims.role || 'staff',
        permissions: authUser.customClaims.permissions || ['view_appointments', 'view_customers', 'view_services'],
        disabled: authUser.disabled || false,
        emailVerified: authUser.emailVerified || false,
        createdAt: authUser.createdAt || new Date().toISOString(),
        lastSignInTime: authUser.lastSignInTime || null,
        syncedFromAuth: true,
        syncedAt: new Date().toISOString()
      };

      await this.db.collection('users').doc(authUser.uid).set(userData);
      logger.info(`[FIX] Added user ${authUser.email} to Firestore`);
    }

    // Remove orphaned Firestore users (if any)
    for (const fsUser of auditResult.missingInAuth) {
      logger.warn(`[FIX] Orphaned Firestore user found: ${fsUser.email} (${fsUser.uid})`);
      // Note: Not automatically deleting, just logging for manual review
    }

    // Fix role inconsistencies
    for (const inconsistency of auditResult.roleInconsistencies) {
      const fsUser = auditResult.firestoreUsers.find(u => u.uid === inconsistency.uid);
      if (fsUser) {
        // Update custom claims to match Firestore role
        await this.auth.setCustomUserClaims(inconsistency.uid, {
          role: fsUser.role,
          permissions: fsUser.permissions || ['view_appointments'],
          isAdmin: fsUser.role === 'admin',
          updatedAt: Date.now(),
          syncFixed: true
        });
        logger.info(`[FIX] Updated custom claims for ${inconsistency.email} to role: ${fsUser.role}`);
      }
    }
  }

  async standardizeCollections(auditResult: CollectionAuditResult): Promise<void> {
    logger.info('[FIX] Starting collection standardization...');

    // Determine primary role collection
    const hasRoleDefinitions = auditResult.roleDefinitions.length > 0;
    const hasRolesCollection = auditResult.rolesCollection.length > 0;

    if (hasRoleDefinitions && hasRolesCollection) {
      logger.info('[FIX] Both role-definitions and roles collections exist. Merging...');
      
      // Merge role definitions into standardized format
      const mergedRoles = new Map();
      
      // Add role-definitions
      auditResult.roleDefinitions.forEach(role => {
        mergedRoles.set(role.id, {
          id: role.id,
          name: role.name || role.id,
          description: role.description || `${role.id} role`,
          permissions: role.permissions || [],
          isSystem: role.isSystem || false,
          createdAt: role.createdAt || new Date().toISOString(),
          source: 'role-definitions'
        });
      });

      // Merge roles collection (roles collection takes priority for conflicts)
      auditResult.rolesCollection.forEach(role => {
        const existing = mergedRoles.get(role.id);
        mergedRoles.set(role.id, {
          ...existing,
          ...role,
          source: existing ? 'merged' : 'roles'
        });
      });

      // Write merged roles to role-definitions collection
      for (const [roleId, roleData] of mergedRoles) {
        await this.db.collection('role-definitions').doc(roleId).set(roleData);
        logger.info(`[FIX] Standardized role: ${roleId}`);
      }

      // Archive the old roles collection
      logger.info('[FIX] Archiving old roles collection...');
      const rolesBackup = auditResult.rolesCollection.map(role => ({
        ...role,
        archivedAt: new Date().toISOString(),
        archivedReason: 'Collection standardization'
      }));

      for (const role of rolesBackup) {
        await this.db.collection('roles-archive').doc(role.id).set(role);
      }

      // Delete old roles collection documents
      for (const role of auditResult.rolesCollection) {
        await this.db.collection('roles').doc(role.id).delete();
      }
    }

    // Ensure default roles exist
    await this.ensureDefaultRoles();
  }

  private async ensureDefaultRoles(): Promise<void> {
    const defaultRoles = [
      {
        id: 'admin',
        name: 'Administrator',
        description: 'Full system access',
        permissions: ['all'],
        isSystem: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'manager',
        name: 'Manager',
        description: 'Management access',
        permissions: [
          'manage_appointments', 'view_appointments', 'create_appointments',
          'manage_customers', 'view_customers', 'create_customers',
          'manage_services', 'view_services', 'create_services',
          'view_analytics', 'view_reports', 'manage_staff_schedule'
        ],
        isSystem: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'staff',
        name: 'Staff',
        description: 'Basic staff access',
        permissions: [
          'view_appointments', 'view_customers', 'view_services', 'view_staff_schedule'
        ],
        isSystem: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'receptionist',
        name: 'Receptionist',
        description: 'Reception and customer service',
        permissions: [
          'view_appointments', 'create_appointments', 'view_customers',
          'create_customers', 'edit_customer_info', 'view_services'
        ],
        isSystem: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'customer',
        name: 'Customer',
        description: 'Customer portal access',
        permissions: [
          'view_own_appointments', 'create_appointments', 'manage_own_pets',
          'view_services', 'view_groomers'
        ],
        isSystem: true,
        createdAt: new Date().toISOString()
      }
    ];

    for (const role of defaultRoles) {
      const existingRole = await this.db.collection('role-definitions').doc(role.id).get();
      if (!existingRole.exists) {
        await this.db.collection('role-definitions').doc(role.id).set(role);
        logger.info(`[FIX] Created default role: ${role.id}`);
      }
    }
  }

  async generateReport(userAudit: UserAuditResult, collectionAudit: CollectionAuditResult): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalAuthUsers: userAudit.firebaseAuthUsers.length,
        totalFirestoreUsers: userAudit.firestoreUsers.length,
        missingInFirestore: userAudit.missingInFirestore.length,
        missingInAuth: userAudit.missingInAuth.length,
        roleInconsistencies: userAudit.roleInconsistencies.length,
        collections: collectionAudit.collections.length,
        roleDefinitions: collectionAudit.roleDefinitions.length,
        rolesCollection: collectionAudit.rolesCollection.length
      },
      details: {
        userAudit,
        collectionAudit
      }
    };

    logger.info('[REPORT] Audit Summary:', report.summary);
    
    // Save detailed report
    await this.db.collection('audit-reports').add(report);
  }

  async runCompleteAuditAndFix(): Promise<void> {
    try {
      logger.info('[AUDIT] Starting comprehensive audit and fix...');

      // Run audits
      const userAudit = await this.auditUsers();
      const collectionAudit = await this.auditCollections();

      // Generate report
      await this.generateReport(userAudit, collectionAudit);

      // Apply fixes
      await this.fixUserSync(userAudit);
      await this.standardizeCollections(collectionAudit);

      logger.info('[AUDIT] Complete audit and fix finished successfully!');
    } catch (error) {
      logger.error('[AUDIT] Error during audit and fix:', error);
      throw error;
    }
  }
}

// Export for use in other scripts
export { AuthRoleAuditor };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const auditor = new AuthRoleAuditor();
  auditor.runCompleteAuditAndFix()
    .then(() => {
      logger.info('[AUDIT] Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('[AUDIT] Script failed:', error);
      process.exit(1);
    });
}