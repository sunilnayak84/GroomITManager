/**
 * ONE-TIME USER PERMISSIONS FIX SCRIPT
 * 
 * This script corrects all user permissions by:
 * 1. Auditing current user data in Firestore vs Firebase Auth
 * 2. Fixing role mismatches between database and custom claims
 * 3. Ensuring all users have correct permissions based on their roles
 * 4. Updating custom claims to match database roles
 */

import { initializeFirebaseAdmin } from '../firebase.js';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from '../utils/logger.js';

interface UserPermissionFix {
  uid: string;
  email: string;
  currentDatabaseRole: string;
  currentCustomClaimsRole: string;
  correctRole: string;
  correctPermissions: string[];
  needsUpdate: boolean;
}

class UserPermissionsFixer {
  private auth: any;
  private db: any;

  constructor() {
    const app = initializeFirebaseAdmin();
    this.auth = getAuth(app);
    this.db = getFirestore(app);
  }

  async analyzeAllUsers(): Promise<UserPermissionFix[]> {
    logger.info('[PERMISSIONS] Starting comprehensive user permissions analysis...');

    // Get all Firebase Auth users
    const authResult = await this.auth.listUsers(1000);
    const fixes: UserPermissionFix[] = [];

    // Get role definitions for reference
    const roleDefinitionsSnapshot = await this.db.collection('role-definitions').get();
    const roleDefinitions = new Map();
    roleDefinitionsSnapshot.docs.forEach((doc: any) => {
      roleDefinitions.set(doc.id, doc.data());
    });

    for (const authUser of authResult.users) {
      try {
        // Get user data from Firestore
        const userDoc = await this.db.collection('users').doc(authUser.uid).get();
        const userData = userDoc.exists ? userDoc.data() : null;

        const databaseRole = userData?.role || 'staff';
        const customClaimsRole = authUser.customClaims?.role || 'none';
        
        // Determine the correct role (database takes precedence, with special handling for admin)
        let correctRole = databaseRole;
        
        // Special case: if this is the development admin user, ensure they're admin
        if (authUser.email === 'admin@groomery.in') {
          correctRole = 'admin';
        }

        // Get correct permissions for the role
        const roleDefinition = roleDefinitions.get(correctRole);
        const correctPermissions = roleDefinition?.permissions || this.getDefaultPermissions(correctRole);

        const needsUpdate = (
          customClaimsRole !== correctRole ||
          !userData ||
          !this.arraysEqual(authUser.customClaims?.permissions || [], correctPermissions)
        );

        fixes.push({
          uid: authUser.uid,
          email: authUser.email || 'no-email',
          currentDatabaseRole: databaseRole,
          currentCustomClaimsRole: customClaimsRole,
          correctRole,
          correctPermissions,
          needsUpdate
        });

        logger.info(`[PERMISSIONS] Analyzed user ${authUser.email}:`, {
          databaseRole,
          customClaimsRole,
          correctRole,
          needsUpdate
        });

      } catch (error) {
        logger.error(`[PERMISSIONS] Error analyzing user ${authUser.email}:`, error);
      }
    }

    return fixes;
  }

  private getDefaultPermissions(role: string): string[] {
    const defaultPermissions = {
      admin: ['all'],
      manager: [
        'manage_appointments', 'view_appointments', 'create_appointments', 'cancel_appointments',
        'manage_customers', 'view_customers', 'create_customers', 'edit_customer_info',
        'manage_services', 'view_services', 'create_services', 'edit_services',
        'manage_staff_schedule', 'view_staff_schedule', 'view_analytics', 'view_reports'
      ],
      staff: [
        'view_appointments', 'view_customers', 'view_services', 'view_staff_schedule', 'manage_own_schedule'
      ],
      receptionist: [
        'view_appointments', 'create_appointments', 'view_customers', 'create_customers', 'view_services'
      ],
      customer: [
        'view_own_appointments', 'create_appointments', 'manage_own_pets', 'view_services'
      ]
    };

    return defaultPermissions[role as keyof typeof defaultPermissions] || defaultPermissions.staff;
  }

  private arraysEqual(a: any[], b: any[]): boolean {
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((val, index) => val === sortedB[index]);
  }

  async applyFixes(fixes: UserPermissionFix[]): Promise<void> {
    logger.info('[PERMISSIONS] Applying permission fixes...');

    const usersNeedingUpdate = fixes.filter(fix => fix.needsUpdate);
    logger.info(`[PERMISSIONS] ${usersNeedingUpdate.length} users need permission updates`);

    for (const fix of usersNeedingUpdate) {
      try {
        logger.info(`[PERMISSIONS] Fixing user ${fix.email} (${fix.uid})`);

        // Update Firestore user document
        await this.db.collection('users').doc(fix.uid).set({
          role: fix.correctRole,
          permissions: fix.correctPermissions,
          updatedAt: Date.now(),
          permissionFixApplied: true,
          permissionFixDate: new Date().toISOString()
        }, { merge: true });

        // Update Firebase Auth custom claims
        await this.auth.setCustomUserClaims(fix.uid, {
          role: fix.correctRole,
          permissions: fix.correctPermissions,
          isAdmin: fix.correctRole === 'admin',
          updatedAt: Date.now(),
          permissionsSynced: true
        });

        // Log the change
        await this.db.collection('permission-fix-log').add({
          userId: fix.uid,
          email: fix.email,
          oldDatabaseRole: fix.currentDatabaseRole,
          oldCustomClaimsRole: fix.currentCustomClaimsRole,
          newRole: fix.correctRole,
          newPermissions: fix.correctPermissions,
          timestamp: Date.now(),
          fixedAt: new Date().toISOString()
        });

        logger.info(`[PERMISSIONS] Successfully fixed ${fix.email}: ${fix.currentCustomClaimsRole} → ${fix.correctRole}`);

        // Small delay to avoid overwhelming Firebase
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        logger.error(`[PERMISSIONS] Error fixing user ${fix.email}:`, error);
      }
    }
  }

  async generateReport(fixes: UserPermissionFix[]): Promise<void> {
    const summary = {
      totalUsers: fixes.length,
      usersNeedingUpdate: fixes.filter(f => f.needsUpdate).length,
      roleDistribution: {} as Record<string, number>,
      fixes: fixes.filter(f => f.needsUpdate).map(f => ({
        email: f.email,
        from: `${f.currentDatabaseRole}/${f.currentCustomClaimsRole}`,
        to: f.correctRole
      }))
    };

    // Count role distribution
    fixes.forEach(fix => {
      summary.roleDistribution[fix.correctRole] = (summary.roleDistribution[fix.correctRole] || 0) + 1;
    });

    logger.info('[PERMISSIONS] Permission Fix Summary:', summary);

    // Save comprehensive report
    await this.db.collection('system-reports').add({
      type: 'permission-fix',
      summary,
      allUsers: fixes,
      timestamp: Date.now(),
      generatedAt: new Date().toISOString()
    });
  }

  async runCompleteFix(): Promise<void> {
    try {
      logger.info('[PERMISSIONS] Starting comprehensive permission fix...');

      const fixes = await this.analyzeAllUsers();
      await this.generateReport(fixes);
      await this.applyFixes(fixes);

      logger.info('[PERMISSIONS] Permission fix completed successfully!');
      
      const usersFixed = fixes.filter(f => f.needsUpdate).length;
      logger.info(`[PERMISSIONS] Fixed permissions for ${usersFixed} users`);
      
    } catch (error) {
      logger.error('[PERMISSIONS] Error during permission fix:', error);
      throw error;
    }
  }
}

// Export for use in other scripts
export { UserPermissionsFixer };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const fixer = new UserPermissionsFixer();
  fixer.runCompleteFix()
    .then(() => {
      logger.info('[PERMISSIONS] Permission fix script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('[PERMISSIONS] Permission fix script failed:', error);
      process.exit(1);
    });
}