import * as admin from 'firebase-admin';
import { getDatabase } from 'firebase-admin/database';
import { getAuth } from 'firebase-admin/auth';
import { 
  RoleTypes, 
  DefaultPermissions,
  InitialRoleConfigs,
  initializeFirebaseAdmin
} from '../firebase';

async function initializeRoles() {
  try {
    console.log('[ROLES] Starting role initialization...');
    
    // Initialize Firebase Admin
    const app = await initializeFirebaseAdmin();
    if (!app) {
      throw new Error('Failed to initialize Firebase Admin');
    }

    const db = getDatabase(app);
    const auth = getAuth(app);
    const timestamp = Date.now();

    // Initialize role definitions
    console.log('[ROLES] Setting up role definitions...');
    const roleDefinitionsRef = db.ref('role-definitions');

    // Get existing roles
    const existingRoles = await roleDefinitionsRef.once('value');
    const currentRoles = existingRoles.exists() ? existingRoles.val() : {};
    
    // Merge existing roles with new roles, preserving existing configurations
    const mergedRoles = {
      ...InitialRoleConfigs,
      ...currentRoles,
      // Ensure customer role is properly set
      [RoleTypes.customer]: {
        ...InitialRoleConfigs[RoleTypes.customer],
        ...currentRoles[RoleTypes.customer],
        permissions: DefaultPermissions[RoleTypes.customer],
        isSystem: true,
        updatedAt: Date.now()
      }
    };

    console.log('[ROLES] Updating role definitions...');
    await roleDefinitionsRef.set(mergedRoles);
    console.log('[ROLES] Role definitions updated successfully');
    console.log('[ROLES] Current roles:', Object.keys(mergedRoles));
    
    // Setup admin user
    const adminEmail = 'admin@groomery.in';
    const adminUid = 'MjQnuZnthzUIh2huoDpqCSMMvxe2';

    // Ensure admin user exists in Firebase Auth
    try {
      await auth.getUser(adminUid);
      console.log('[ROLES] Found existing admin user');
    } catch (error) {
      console.log('[ROLES] Creating admin user...');
      await auth.createUser({
        uid: adminUid,
        email: adminEmail,
        emailVerified: true,
        displayName: 'Admin User'
      });
    }

    // Set admin role in Realtime Database
    await db.ref(`roles/${adminUid}`).set({
      role: RoleTypes.admin,
      permissions: DefaultPermissions[RoleTypes.admin],
      isAdmin: true,
      updatedAt: timestamp
    });

    // Set admin custom claims
    await auth.setCustomUserClaims(adminUid, {
      role: RoleTypes.admin,
      permissions: DefaultPermissions[RoleTypes.admin],
      isAdmin: true,
      updatedAt: timestamp
    });

    // Create role history entry
    await db.ref(`role-history/${adminUid}`).push({
      action: 'initial_setup',
      role: RoleTypes.admin,
      permissions: DefaultPermissions[RoleTypes.admin],
      timestamp,
      type: 'setup'
    });

    console.log('[ROLES] Role initialization completed successfully');
    return true;
  } catch (error) {
    console.error('[ROLES] Error initializing roles:', error);
    throw error;
  }
}

// Run the initialization
initializeRoles()
  .then(() => {
    console.log('[ROLES] Setup completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('[ROLES] Setup failed:', error);
    process.exit(1);
  });