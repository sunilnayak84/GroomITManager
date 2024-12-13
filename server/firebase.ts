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

// Initialize Firebase Admin
export function initializeFirebaseAdmin() {
  if (admin.apps.length) {
    return admin.apps[0];
  }

  const isDevelopment = process.env.NODE_ENV === 'development';
  console.log('🟢 Initializing Firebase in', isDevelopment ? 'development' : 'production', 'mode');

  try {
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

    // Initialize Firebase Admin SDK
    const app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: projectId || 'development-project',
        clientEmail: clientEmail || 'development@example.com',
        privateKey: privateKey || '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC9QFi8Lg3Xy+Vj\n-----END PRIVATE KEY-----\n'
      }),
      databaseURL: 'https://replit-5ac6a-default-rtdb.asia-southeast1.firebasedatabase.app'
    });

    // Test Realtime Database connection
    const db = getDatabase(app);
    await new Promise((resolve, reject) => {
      const connectRef = db.ref('.info/connected');
      const timeout = setTimeout(() => {
        connectRef.off();
        reject(new Error('Database connection timeout'));
      }, 5000);

      connectRef.on('value', (snap) => {
        if (snap.val() === true) {
          clearTimeout(timeout);
          connectRef.off();
          resolve(true);
        }
      }, (error) => {
        clearTimeout(timeout);
        connectRef.off();
        reject(error);
      });
    });

    // Test database connection
    const db = getDatabase(app);
    db.ref('.info/connected').on('value', (snapshot) => {
      if (snapshot.val() === true) {
        console.log('🟢 Connected to Firebase Realtime Database');
      } else {
        console.log('🔴 Disconnected from Firebase Realtime Database');
      }
    });

    console.log('🟢 Firebase Admin SDK initialized successfully');

    if (isDevelopment) {
      setupDevelopmentAdmin(app).catch(error => {
        console.warn('⚠️ Failed to setup development admin:', error);
      });
    }

    return app;
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

// Get Firebase Admin instance
export function getFirebaseAdmin() {
  return initializeFirebaseAdmin();
}

// Get user role and permissions from Realtime Database
export async function getUserRole(uid: string): Promise<{ role: keyof typeof RoleTypes; permissions: string[] } | null> {
  const app = getFirebaseAdmin();
  if (!app) {
    console.warn('Firebase Admin not initialized');
    return null;
  }

  try {
    const db = getDatabase(app);
    const snapshot = await db.ref(`roles/${uid}`).once('value');
    const data = snapshot.val();

    if (!data) {
      console.warn(`No role found for user ${uid}, using default staff role`);
      await updateUserRole(uid, RoleTypes.staff);
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
    if (process.env.NODE_ENV === 'development') {
      return {
        role: RoleTypes.staff,
        permissions: DefaultPermissions[RoleTypes.staff]
      };
    }
    return null;
  }
}

// Update user role in Realtime Database
export async function updateUserRole(uid: string, roleType: keyof typeof RoleTypes) {
  const app = getFirebaseAdmin();
  if (!app) {
    throw new Error('Firebase Admin not initialized');
  }

  try {
    const db = getDatabase(app);
    const userRoleRef = db.ref(`roles/${uid}`);
    
    const roleData = {
      role: roleType,
      permissions: DefaultPermissions[roleType],
      updatedAt: admin.database.ServerValue.TIMESTAMP
    };

    await userRoleRef.set(roleData);
    console.log(`🟢 Role updated for user ${uid} to ${roleType}`);

    // Force token refresh to ensure the user gets the new role
    await admin.auth().revokeRefreshTokens(uid);
    console.log(`🟢 Tokens revoked for user ${uid}`);
    
    return { role: roleType, permissions: DefaultPermissions[roleType] };
  } catch (error) {
    console.error('🔴 Error updating user role:', error);
    throw error;
  }
}

// Setup development admin user
async function setupDevelopmentAdmin(app: admin.app.App) {
  const auth = app.auth();
  const db = app.database();

  const adminEmail = 'admin@groomery.in';
  
  try {
    let adminUser;
    
    try {
      adminUser = await auth.getUserByEmail(adminEmail);
      console.log('🟢 Existing admin user found');
    } catch {
      adminUser = await auth.createUser({
        email: adminEmail,
        password: 'admin123',
        emailVerified: true,
        displayName: 'Admin User'
      });
      console.log('🟢 New admin user created');
    }

    // Set up role in Realtime Database
    const roleRef = db.ref(`roles/${adminUser.uid}`);
    await roleRef.set({
      role: RoleTypes.admin,
      permissions: DefaultPermissions[RoleTypes.admin],
      isAdmin: true,
      updatedAt: admin.database.ServerValue.TIMESTAMP
    });
    
    // Verify the role was set
    const snapshot = await roleRef.once('value');
    if (!snapshot.exists()) {
      throw new Error('Failed to set admin role in database');
    }

    console.log('🟢 Admin role and permissions set in database');
    
    // Force token refresh
    await auth.revokeRefreshTokens(adminUser.uid);
    
    console.log('🟢 Development admin setup complete');
  } catch (error) {
    console.error('🔴 Error setting up development admin:', error);
    throw error;
  }
}
export async function listAllUsers(pageSize = 1000, pageToken?: string) {
  const app = getFirebaseAdmin();
  if (!app) {
    throw new Error('Firebase Admin not initialized');
  }

  try {
    const auth = app.auth();
    const db = app.database();
    
    console.log('[FIREBASE-USERS] Starting user fetch...');
    const listUsersResult = await auth.listUsers(pageSize, pageToken);
    
    if (!listUsersResult.users.length) {
      console.log('[FIREBASE-USERS] No users found');
      return { users: [], pageToken: null };
    }
    
    console.log(`[FIREBASE-USERS] Found ${listUsersResult.users.length} users in Auth`);
    
    // Create a single transaction to get all roles at once
    const rolesRef = db.ref('roles');
    const rolesSnapshot = await rolesRef.once('value');
    const rolesData = rolesSnapshot.val() || {};
    
    // Process users with their roles
    const userRoles = await Promise.all(
      listUsersResult.users.map(async (user) => {
        const roleData = rolesData[user.uid];
        const role = roleData?.role || RoleTypes.staff;
        
        // Set default role if none exists
        if (!roleData) {
          console.log(`[FIREBASE-USERS] Setting default role for user ${user.uid}`);
          const defaultRole = {
            role: RoleTypes.staff,
            permissions: DefaultPermissions[RoleTypes.staff],
            updatedAt: admin.database.ServerValue.TIMESTAMP
          };
          
          try {
            await db.ref(`roles/${user.uid}`).set(defaultRole);
          } catch (error) {
            console.error(`[FIREBASE-USERS] Error setting default role for ${user.uid}:`, error);
          }
        }
        
        return {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email?.split('@')[0] || 'Unknown User',
          role: role,
          permissions: roleData?.permissions || DefaultPermissions[role],
          disabled: user.disabled,
          lastSignInTime: user.metadata.lastSignInTime,
          creationTime: user.metadata.creationTime
        };
      })
    );

    console.log(`[FIREBASE-USERS] Successfully processed ${userRoles.length} users with roles`);
    return {
      users: userRoles,
      pageToken: listUsersResult.pageToken
    };
  } catch (error) {
    console.error('[FIREBASE-USERS] Error listing users:', error);
    throw error;
  }
}