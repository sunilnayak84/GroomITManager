import * as admin from 'firebase-admin';
import { getDatabase } from 'firebase-admin/database';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get admin credentials from environment variables
const adminUid = process.env.ADMIN_UID || 'MjQnuZnthzUIh2huoDpqCSMMvxe2';
const adminEmail = process.env.ADMIN_EMAIL || 'admin@groomery.in';

// Function to get Firebase configuration
function getFirebaseConfig() {
  console.log('Fetching Firebase configuration...');
  
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    console.error('Missing Firebase configuration:', {
      hasProjectId: !!projectId,
      hasClientEmail: !!clientEmail,
      hasPrivateKey: !!privateKey
    });
    throw new Error('Missing required Firebase configuration. Required: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
  }

  // Format private key
  try {
    // Remove quotes and replace escaped newlines
    privateKey = privateKey.replace(/\\n/g, '\n');
    privateKey = privateKey.replace(/^["']|["']$/g, '');
    
    if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
      privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`;
    }
    
    console.log('Private key formatted successfully');
  } catch (error) {
    console.error('Error formatting private key:', error);
    throw new Error(`Failed to format private key: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  const config = {
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey
    }),
    databaseURL: `https://${projectId}-default-rtdb.firebaseio.com`
  };

  console.log('Firebase configuration prepared successfully');
  return config;
}

// System roles that cannot be modified
const SYSTEM_ROLES = ['admin', 'manager', 'staff', 'receptionist'];

async function setupAdminRole() {
  console.log('Starting admin role setup...');
  let app: admin.app.App | null = null;
  
  try {
    // Check if Firebase Admin is already initialized
    if (admin.apps.length) {
      console.log('Firebase Admin already initialized, getting existing app');
      app = admin.app();
      return app;
    }

    console.log('Initializing Firebase Admin...');
    const config = getFirebaseConfig();
    
    // Initialize Firebase Admin with credentials
    app = admin.initializeApp(config);

    console.log('Firebase Admin initialized successfully');
    
    // Verify Firebase Admin initialization
    try {
      await app.auth().listUsers(1);
      console.log('Firebase Admin authentication verified');
    } catch (error) {
      console.error('Failed to verify Firebase Admin initialization:', error);
      throw new Error('Firebase Admin initialization verification failed');
    }

    console.log('Firebase Admin initialized successfully');
    const db = getDatabase(app);
    const timestamp = Date.now();
  
    // Data for role definition (system roles)
    const systemRoles = {
      admin: {
        name: 'admin',
        permissions: [
          'manage_appointments', 'view_appointments', 'create_appointments', 'cancel_appointments',
          'manage_customers', 'view_customers', 'create_customers', 'edit_customer_info',
          'manage_services', 'view_services', 'create_services', 'edit_services',
          'manage_inventory', 'view_inventory', 'update_stock', 'manage_consumables',
          'manage_staff_schedule', 'view_staff_schedule', 'manage_own_schedule',
          'view_analytics', 'view_reports', 'view_financial_reports',
          'manage_roles', 'assign_roles', 'create_roles', 'all'
        ],
        description: 'Full system access',
        isSystem: true,
        createdAt: timestamp,
        updatedAt: timestamp
      },
      manager: {
        name: 'manager',
        permissions: [
          'manage_appointments', 'view_appointments', 'create_appointments',
          'manage_customers', 'view_customers', 'create_customers',
          'manage_services', 'view_services',
          'manage_inventory', 'view_inventory',
          'view_analytics', 'view_reports'
        ],
        description: 'Branch management access',
        isSystem: true,
        createdAt: timestamp,
        updatedAt: timestamp
      },
      staff: {
        name: 'staff',
        permissions: [
          'view_appointments', 'view_customers',
          'view_services', 'manage_own_schedule'
        ],
        description: 'Basic staff access',
        isSystem: true,
        createdAt: timestamp,
        updatedAt: timestamp
      },
      receptionist: {
        name: 'receptionist',
        permissions: [
          'view_appointments', 'create_appointments',
          'view_customers', 'create_customers',
          'view_services'
        ],
        description: 'Front desk operations',
        isSystem: true,
        createdAt: timestamp,
        updatedAt: timestamp
      }
    };

    // Data for admin user role assignment
    const roleData = {
      uid: adminUid,
      email: adminEmail,
      role: 'admin',
      permissions: systemRoles.admin.permissions,
      isSystem: true,
      isAdmin: true,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    // Data for role assignment history
    const assignmentData = {
      uid: adminUid,
      email: adminEmail,
      role: 'admin',
      assignedBy: 'system',
      assignedAt: timestamp,
      lastUpdated: timestamp,
      isAdmin: true,
      permissions: roleData.permissions,
      status: 'active'
    };

    try {
      console.log('Writing role data to Firebase...');
      
      // Write role data with transaction to ensure atomicity
      const updates: { [key: string]: any } = {};
      
      // Add system role definitions
      updates['role-definitions'] = systemRoles;
      
      // Add admin user role assignment
      updates[`roles/${adminUid}`] = roleData;
      updates[`role-assignments/${adminUid}`] = assignmentData;
      
      // Add role change history
      updates[`role-history/${adminUid}/${timestamp}`] = {
        type: 'system_init',
        role: 'admin',
        timestamp,
        changedBy: 'system',
        previousRole: null,
        newRole: 'admin',
        metadata: {
          isSystemInit: true,
          adminEmail
        }
      };
      
      // Execute updates atomically
      await db.ref().update(updates);
      console.log('✅ Successfully wrote role data and assignments');

      // Verify the data was written
      console.log('Verifying data...');
      const [roleVerify, assignmentVerify] = await Promise.all([
        db.ref(`roles/${adminUid}`).once('value'),
        db.ref(`role-assignments/${adminUid}`).once('value')
      ]);

      if (!roleVerify.exists()) {
        throw new Error('Role data verification failed');
      }
      if (!assignmentVerify.exists()) {
        throw new Error('Role assignment verification failed');
      }

      const verifiedRole = roleVerify.val();
      const verifiedAssignment = assignmentVerify.val();

      console.log('✅ Successfully verified data in Firebase:');
      console.log('Role data:', JSON.stringify(verifiedRole, null, 2));
      console.log('Assignment data:', JSON.stringify(verifiedAssignment, null, 2));
      
      await app.delete(); // Clean up Firebase Admin instance
      console.log('✅ Setup completed successfully');
      process.exit(0);
    } catch (error) {
      console.error('🔴 Error setting up admin role:', error);
      if (app) {
        await app.delete(); // Ensure cleanup even on error
      }
      process.exit(1);
    }
  } catch (error) {
    console.error('🔴 Unhandled error:', error);
    process.exit(1);
  }
}

setupAdminRole().catch(error => {
  console.error('🔴 Unhandled error:', error);
  process.exit(1);
});
