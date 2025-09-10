import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { 
  initializeFirebaseAdmin, 
  InitialRoleConfigs, 
  RoleTypes,
  updateUserRole,
  DefaultPermissions 
} from '../firebase';
import { getDatabase } from 'firebase-admin/database';
import { getAuth } from 'firebase-admin/auth';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from the root .env file
dotenv.config({ path: resolve(__dirname, '../../.env') });

// Verify environment variables
const requiredEnvVars = ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('Missing required environment variables:', missingVars.join(', '));
  process.exit(1);
}

async function setupRoles() {
  console.log('Starting role setup...');
  
  try {
    console.log('[ROLE-SETUP] Initializing Firebase Admin...');
    const app = await initializeFirebaseAdmin();
    
    if (!app) {
      throw new Error('Failed to initialize Firebase Admin');
    }

    const db = getDatabase(app);
    const auth = getAuth(app);
    const timestamp = Date.now();

    // Admin user details
    const adminEmail = 'admin@groomery.in';
    const adminUid = 'MjQnuZnthzUIh2huoDpqCSMMvxe2';

    console.log(`[ROLE-SETUP] Setting up roles for admin user ${adminEmail}`);

    // Check if roles are already initialized
    const existingRolesSnapshot = await db.ref('role-definitions').once('value');
    const existingRoles = existingRolesSnapshot.val();

    if (!existingRoles) {
      console.log('[ROLE-SETUP] Initializing role definitions...');
      // Initialize role definitions with system roles
      await db.ref('role-definitions').set(InitialRoleConfigs);
      console.log('[ROLE-SETUP] Role definitions initialized');
    } else {
      console.log('[ROLE-SETUP] Role definitions already exist');
    }

    // Set up admin user role
    console.log('[ROLE-SETUP] Setting up admin user...');
    
    // Check if admin user exists in Firebase Auth
    try {
      const userRecord = await auth.getUser(adminUid);
      console.log(`[ROLE-SETUP] Found admin user: ${userRecord.email}`);
      
      // Update admin role with all permissions
      await updateUserRole(adminUid, RoleTypes.admin);
      console.log('[ROLE-SETUP] Admin role set successfully');
      
      // Set custom claims for admin
      await auth.setCustomUserClaims(adminUid, {
        role: RoleTypes.admin,
        permissions: DefaultPermissions.admin,
        isAdmin: true,
        updatedAt: timestamp
      });
      console.log('[ROLE-SETUP] Admin custom claims set');

      // Create role history entry
      await db.ref(`role-history/${adminUid}/${timestamp}`).set({
        action: 'setup',
        role: RoleTypes.admin,
        email: adminEmail,
        permissions: DefaultPermissions.admin,
        timestamp,
        type: 'initial_setup'
      });
      
    } catch (error) {
      console.error('[ROLE-SETUP] Error setting up admin:', error);
      throw new Error('Failed to setup admin user');
    }

    // Verify the setup
    console.log('[ROLE-SETUP] Verifying setup...');
    
    const roleVerify = await db.ref('role-definitions').once('value');
    const adminRoleVerify = await db.ref(`roles/${adminUid}`).once('value');

    if (!roleVerify.exists()) {
      throw new Error('Role definitions verification failed');
    }

    if (!adminRoleVerify.exists()) {
      throw new Error('Admin role verification failed');
    }

    const adminRole = adminRoleVerify.val();
    if (adminRole.role !== RoleTypes.admin) {
      throw new Error('Admin role verification failed - incorrect role');
    }

    console.log('✅ Setup verified successfully');
    console.log('Role definitions:', roleVerify.val());
    console.log('Admin role:', adminRole);
    
    return true;
  } catch (error) {
    console.error('Failed to setup roles:', error);
    throw error;
  }
}

// Run the setup
setupRoles()
  .then(() => {
    console.log('✅ Role setup completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Role setup failed:', error);
    process.exit(1);
  });