import admin from 'firebase-admin';

let firebaseAdmin: admin.app.App | undefined;

export function initializeFirebaseAdmin() {
  if (firebaseAdmin) {
    return firebaseAdmin;
  }

  const isDevelopment = process.env.NODE_ENV === 'development';
  console.log('🟢 Initializing Firebase in', isDevelopment ? 'development' : 'production', 'mode');
  
  try {
    // Clean up any existing Firebase apps
    if (admin.apps.length) {
      console.log('🟢 Cleaning up existing Firebase apps');
      admin.apps.forEach(app => app?.delete());
    }

    let privateKey = process.env.FIREBASE_PRIVATE_KEY || '';
    
    // Clean up and format private key
    if (privateKey) {
      // Remove extra quotes and replace escaped newlines
      privateKey = privateKey.replace(/\\n/g, '\n').replace(/^['"]|['"]$/g, '');
      
      // Add PEM format if missing
      if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
        privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----\n`;
      }
    }

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

    // Validate credentials
    if (!isDevelopment && (!projectId || !clientEmail || !privateKey)) {
      throw new Error('Required Firebase environment variables are missing');
    }

    // Initialize Firebase Admin SDK
    const credential = admin.credential.cert({
      projectId: projectId || 'development-project',
      clientEmail: clientEmail || 'development@example.com',
      privateKey: privateKey || '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC9QFi8Lg3Xy+Vj\n-----END PRIVATE KEY-----\n'
    });

    firebaseAdmin = admin.initializeApp({
      credential
    });

    console.log('🟢 Firebase Admin SDK initialized successfully');

    // Set up development admin user if in development mode
    if (isDevelopment) {
      setupDevelopmentAdmin().catch(error => {
        console.warn('⚠️ Failed to setup development admin:', error);
      });
    }

    return firebaseAdmin;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('🔴 Error initializing Firebase Admin:', errorMessage);
    
    if (isDevelopment) {
      console.warn('⚠️ Continuing in development mode despite Firebase error');
      return undefined;
    }
    throw error;
  }
}

async function setupDevelopmentAdmin() {
  const auth = admin.auth();
  const adminEmail = 'admin@groomery.in';
  
  try {
    let adminUser;
    
    // Try to get existing admin
    try {
      adminUser = await auth.getUserByEmail(adminEmail);
      console.log('🟢 Existing admin user found');
    } catch {
      // Create new admin user if doesn't exist
      adminUser = await auth.createUser({
        email: adminEmail,
        password: 'admin123',
        emailVerified: true,
        displayName: 'Admin User'
      });
      console.log('🟢 New admin user created');
    }

    // Set admin claims
    await auth.setCustomUserClaims(adminUser.uid, {
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
    });

    console.log('🟢 Admin role and permissions set successfully');
    
    // Verify the claims were set
    const updatedUser = await auth.getUser(adminUser.uid);
    console.log('🟢 Admin user claims set:', updatedUser.customClaims);
    
    // Force token refresh
    await auth.revokeRefreshTokens(adminUser.uid);
  } catch (error) {
    console.error('🔴 Error setting up development admin:', error);
    throw error;
  }
}

export function getFirebaseAdmin() {
  if (!firebaseAdmin) {
    return initializeFirebaseAdmin();
  }
  return firebaseAdmin;
}
