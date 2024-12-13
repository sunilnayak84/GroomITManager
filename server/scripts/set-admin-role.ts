import admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';

async function setAdminRole() {
  try {
    const adminEmail = 'admin@groomery.in';
    
    // Get user by email
    const userRecord = await getAuth().getUserByEmail(adminEmail);
    console.log('Found user:', userRecord.uid);
    
    // Define admin claims
    const adminClaims = {
      role: 'admin',
      permissions: [
        'manage_appointments',
        'view_appointments',
        'create_appointments',
        'cancel_appointments',
        'manage_customers',
        'view_customers',
        'create_customers',
        'edit_customer_info',
        'manage_services',
        'view_services',
        'create_services',
        'edit_services',
        'manage_inventory',
        'view_inventory',
        'update_stock',
        'manage_consumables',
        'manage_staff_schedule',
        'view_staff_schedule',
        'manage_own_schedule',
        'view_analytics',
        'view_reports',
        'view_financial_reports',
        'all'
      ],
      isAdmin: true,
      updatedAt: new Date().toISOString()
    };

    // Set custom claims
    await getAuth().setCustomUserClaims(userRecord.uid, adminClaims);
    console.log('Admin role set successfully');

    // Verify the claims were set
    const updatedUser = await getAuth().getUser(userRecord.uid);
    console.log('Updated user claims:', updatedUser.customClaims);

    // Force token refresh
    await getAuth().revokeRefreshTokens(userRecord.uid);
    console.log('Refresh tokens revoked to force token update');

  } catch (error) {
    console.error('Error setting admin role:', error);
    throw error;
  }
}

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  let privateKey = process.env.FIREBASE_PRIVATE_KEY || '';
  if (privateKey) {
    privateKey = privateKey.replace(/\\n/g, '\n').replace(/^['"]|['"]$/g, '');
    if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
      privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`;
    }
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey
    })
  });
}

// Run the function
setAdminRole().then(() => {
  console.log('Completed setting admin role');
  process.exit(0);
}).catch((error) => {
  console.error('Failed to set admin role:', error);
  process.exit(1);
});
