import admin from 'firebase-admin';
import { getDatabase } from 'firebase-admin/database';

// Define role types (lowercase to match database)
export const RoleTypes = {
  admin: 'admin',
  manager: 'manager',
  staff: 'staff',
  receptionist: 'receptionist'
} as const;

// Define default permissions for each role
export const DefaultPermissions = {
  [RoleTypes.admin]: [
    'manage_appointments', 'view_appointments', 'create_appointments', 'cancel_appointments',
    'manage_customers', 'view_customers', 'create_customers', 'edit_customer_info',
    'manage_services', 'view_services', 'create_services', 'edit_services',
    'manage_inventory', 'view_inventory', 'update_stock', 'manage_consumables',
    'manage_staff_schedule', 'view_staff_schedule', 'manage_own_schedule',
    'view_analytics', 'view_reports', 'view_financial_reports', 'all'
  ],
  [RoleTypes.manager]: [
    'view_appointments', 'create_appointments', 'cancel_appointments',
    'view_customers', 'create_customers', 'edit_customer_info',
    'view_services', 'view_inventory', 'update_stock',
    'manage_staff_schedule', 'view_staff_schedule', 'manage_own_schedule',
    'view_analytics'
  ],
  [RoleTypes.staff]: [
    'view_appointments', 'create_appointments',
    'view_customers', 'create_customers',
    'view_services', 'view_inventory',
    'manage_own_schedule'
  ],
  [RoleTypes.receptionist]: [
    'view_appointments', 'create_appointments',
    'view_customers', 'create_customers',
    'view_services'
  ]
};

let firebaseApp: admin.app.App | null = null;

// Initialize Firebase Admin
export async function initializeFirebaseAdmin() {
  if (firebaseApp) {
    return firebaseApp;
  }

  const isDevelopment = process.env.NODE_ENV === 'development';
  console.log('🟢 Initializing Firebase in', isDevelopment ? 'development' : 'production', 'mode');

  try {
    // In development mode, use default credentials if environment variables are missing
    let privateKey = process.env.FIREBASE_PRIVATE_KEY || '';
    if (privateKey) {
      privateKey = privateKey.replace(/\\n/g, '\n').replace(/^['"]|['"]$/g, '');
      if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
        privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----\n`;
      }
    }

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

    if (!isDevelopment && (!projectId || !clientEmail || !privateKey)) {
      throw new Error('Missing required Firebase environment variables');
    }

    // Initialize Firebase Admin SDK with correct database URL
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: projectId || 'development-project',
        clientEmail: clientEmail || 'development@example.com',
        privateKey: privateKey || '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC9QFi8Lg3Xy+Vj\n-----END PRIVATE KEY-----\n'
      }),
      databaseURL: 'https://replit-5ac6a-default-rtdb.asia-southeast1.firebasedatabase.app/'
    });

    // Test database connection
    const db = getDatabase(firebaseApp);
    await db.ref('.info/connected').once('value');

    console.log('🟢 Firebase Admin SDK initialized successfully');

    if (isDevelopment) {
      await setupDevelopmentAdmin(firebaseApp);
    }

    return firebaseApp;
  } catch (error) {
    console.error('🔴 Error initializing Firebase Admin:', error);
    if (isDevelopment) {
      console.warn('⚠️ Continuing in development mode despite Firebase error');
      return null;
    }
    throw error;
  }
}

// Get Firebase Admin instance
export async function getFirebaseAdmin() {
  if (!firebaseApp) {
    firebaseApp = await initializeFirebaseAdmin();
  }
  return firebaseApp;
}

// Get user role from Realtime Database
export async function getUserRole(uid: string) {
  const app = await getFirebaseAdmin();
  if (!app) {
    console.warn('Firebase Admin not initialized');
    return null;
  }

  try {
    const db = getDatabase(app);
    const snapshot = await db.ref(`roles/${uid}`).once('value');
    const data = snapshot.val();

    if (!data) {
      console.warn(`No role found for user ${uid}`);
      return {
        role: RoleTypes.staff,
        permissions: DefaultPermissions[RoleTypes.staff]
      };
    }

    return {
      role: data.role as keyof typeof RoleTypes,
      permissions: data.permissions || DefaultPermissions[data.role as keyof typeof RoleTypes]
    };
  } catch (error) {
    console.error('Error fetching user role:', error);
    return null;
  }
}

// Update user role
export async function updateUserRole(uid: string, roleType: keyof typeof RoleTypes) {
  const app = await getFirebaseAdmin();
  if (!app) {
    throw new Error('Firebase Admin not initialized');
  }

  try {
    const db = getDatabase(app);
    const roleRef = db.ref(`roles/${uid}`);
    const timestamp = Date.now();
    
    await roleRef.set({
      role: roleType,
      permissions: DefaultPermissions[roleType],
      updatedAt: timestamp
    });

    await app.auth().revokeRefreshTokens(uid);
    console.log(`Role updated for user ${uid} to ${roleType}`);
    
    return { role: roleType, permissions: DefaultPermissions[roleType] };
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
}

// Setup development admin
async function setupDevelopmentAdmin(app: admin.app.App) {
  try {
    const adminEmail = 'admin@groomery.in';
    const auth = app.auth();
    const db = getDatabase(app);
    
    // Get or create admin user
    let adminUser;
    try {
      adminUser = await auth.getUserByEmail(adminEmail);
      console.log('🟢 Existing admin user found:', adminUser.uid);
    } catch {
      adminUser = await auth.createUser({
        email: adminEmail,
        password: 'admin123',
        emailVerified: true,
        displayName: 'Admin User'
      });
      console.log('🟢 New admin user created:', adminUser.uid);
    }

    // Set admin role with all permissions
    const roleRef = db.ref(`roles/${adminUser.uid}`);
    const timestamp = Date.now();
    
    const adminData = {
      role: RoleTypes.admin,
      permissions: DefaultPermissions[RoleTypes.admin],
      isAdmin: true,
      updatedAt: timestamp
    };
    
    await roleRef.set(adminData);
    console.log('🟢 Admin role data set:', adminData);

    // Verify role was set
    const snapshot = await roleRef.once('value');
    if (!snapshot.exists()) {
      throw new Error('Failed to set admin role');
    }
    console.log('🟢 Admin role verified:', snapshot.val());

    // Force token refresh
    await auth.revokeRefreshTokens(adminUser.uid);
    console.log('🟢 Development admin setup complete for user:', adminUser.uid);
    
    return adminUser;
  } catch (error) {
    console.error('⚠️ Development admin setup error:', error);
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ Continuing in development mode despite error');
      return null;
    }
    throw error;
  }
}

// List all users with their roles
export async function listAllUsers(pageSize = 1000, pageToken?: string) {
  const app = await getFirebaseAdmin();
  if (!app) {
    throw new Error('Firebase Admin not initialized');
  }

  try {
    const auth = app.auth();
    const db = getDatabase(app);
    
    console.log('[FIREBASE-USERS] Starting user fetch...');
    const listUsersResult = await auth.listUsers(pageSize, pageToken);
    
    if (!listUsersResult.users.length) {
      return { users: [], pageToken: null };
    }
    
    // Get all roles at once
    const rolesRef = db.ref('roles');
    const rolesSnapshot = await rolesRef.once('value');
    const rolesData = rolesSnapshot.val() || {};

    // Process users with roles
    const users = await Promise.all(listUsersResult.users.map(async (user) => {
      const roleData = rolesData[user.uid];
      const role = roleData?.role || RoleTypes.staff;
      
      return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email?.split('@')[0] || 'Unknown User',
        role,
        permissions: roleData?.permissions || DefaultPermissions[role],
        disabled: user.disabled,
        lastSignInTime: user.metadata.lastSignInTime,
        creationTime: user.metadata.creationTime
      };
    }));

    return {
      users,
      pageToken: listUsersResult.pageToken
    };
  } catch (error) {
    console.error('[FIREBASE-USERS] Error listing users:', error);
    throw error;
  }
}