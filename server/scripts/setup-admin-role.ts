import * as admin from 'firebase-admin';
import { getDatabase } from 'firebase-admin/database';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const adminUid = 'MjQnuZnthzUIh2huoDpqCSMMvxe2';
const adminEmail = 'admin@groomery.in';

async function setupAdminRole() {
  console.log('Starting admin role setup...');
  
  try {
    // Get required environment variables
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    
    if (!projectId || !clientEmail || !privateKey) {
      throw new Error('Missing required Firebase environment variables');
    }

    console.log('Initializing Firebase Admin...');
    
    // Initialize Firebase Admin with credentials
    const app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n')
      }),
      databaseURL: 'https://replit-5ac6a-default-rtdb.asia-southeast1.firebasedatabase.app/'
    });

    console.log('Firebase Admin initialized successfully');
    const db = getDatabase(app);
    const timestamp = Date.now();
  
    // Data for role assignment
    const roleData = {
      uid: adminUid,
      email: adminEmail,
      role: 'admin',
      permissions: [
        'manage_appointments', 'view_appointments', 'create_appointments', 'cancel_appointments',
        'manage_customers', 'view_customers', 'create_customers', 'edit_customer_info',
        'manage_services', 'view_services', 'create_services', 'edit_services',
        'manage_inventory', 'view_inventory', 'update_stock', 'manage_consumables',
        'manage_staff_schedule', 'view_staff_schedule', 'manage_own_schedule',
        'view_analytics', 'view_reports', 'view_financial_reports', 'all'
      ],
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
      
      // Add role data
      updates[`roles/${adminUid}`] = roleData;
      updates[`role-assignments/${adminUid}`] = assignmentData;
      
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
