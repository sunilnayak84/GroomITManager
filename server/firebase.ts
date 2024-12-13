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
  admin: [
    'manage_appointments', 'view_appointments', 'create_appointments', 'cancel_appointments',
    'manage_customers', 'view_customers', 'create_customers', 'edit_customer_info',
    'manage_services', 'view_services', 'create_services', 'edit_services',
    'manage_inventory', 'view_inventory', 'update_stock', 'manage_consumables',
    'manage_staff_schedule', 'view_staff_schedule', 'manage_own_schedule',
    'view_analytics', 'view_reports', 'view_financial_reports', 'all'
  ],
  manager: [
    'view_appointments', 'create_appointments', 'cancel_appointments',
    'view_customers', 'create_customers', 'edit_customer_info',
    'view_services', 'view_inventory', 'update_stock',
    'manage_staff_schedule', 'view_staff_schedule', 'manage_own_schedule',
    'view_analytics'
  ],
  staff: [
    'view_appointments', 'create_appointments',
    'view_customers', 'create_customers',
    'view_services', 'view_inventory',
    'manage_own_schedule'
  ],
  receptionist: [
    'view_appointments', 'create_appointments',
    'view_customers', 'create_customers',
    'view_services'
  ]
} as const;

// Define initial role configurations
const InitialRoleConfigs = {
  [RoleTypes.admin]: {
    name: 'admin',
    permissions: [
      'manage_appointments', 'view_appointments', 'create_appointments', 'cancel_appointments',
      'manage_customers', 'view_customers', 'create_customers', 'edit_customer_info',
      'manage_services', 'view_services', 'create_services', 'edit_services',
      'manage_inventory', 'view_inventory', 'update_stock', 'manage_consumables',
      'manage_staff_schedule', 'view_staff_schedule', 'manage_own_schedule',
      'view_analytics', 'view_reports', 'view_financial_reports', 'all'
    ],
    isSystem: true
  },
  [RoleTypes.manager]: {
    name: 'manager',
    permissions: [
      'view_appointments', 'create_appointments', 'cancel_appointments',
      'view_customers', 'create_customers', 'edit_customer_info',
      'view_services', 'view_inventory', 'update_stock',
      'manage_staff_schedule', 'view_staff_schedule', 'manage_own_schedule',
      'view_analytics'
    ],
    isSystem: true
  },
  [RoleTypes.staff]: {
    name: 'staff',
    permissions: [
      'view_appointments', 'create_appointments',
      'view_customers', 'create_customers',
      'view_services', 'view_inventory',
      'manage_own_schedule'
    ],
    isSystem: true
  },
  [RoleTypes.receptionist]: {
    name: 'receptionist',
    permissions: [
      'view_appointments', 'create_appointments',
      'view_customers', 'create_customers',
      'view_services'
    ],
    isSystem: true
  }
};

// Function to initialize roles in Firebase
async function initializeRoles(app: admin.app.App) {
  const db = getDatabase(app);
  const rolesRef = db.ref('role-definitions');
  
  try {
    // Check if roles are already initialized
    const snapshot = await rolesRef.once('value');
    if (!snapshot.exists()) {
      console.log('Initializing default roles in Firebase...');
      
      // Create initial role configurations with timestamps
      const timestamp = admin.database.ServerValue.TIMESTAMP;
      const roleConfigs = Object.entries(DefaultPermissions).reduce((acc, [role, permissions]) => ({
        ...acc,
        [role]: {
          name: role,
          permissions,
          isSystem: true,
          createdAt: timestamp,
          updatedAt: timestamp
        }
      }), {});

      await rolesRef.set(roleConfigs);
      console.log('Default roles initialized successfully');
    } else {
      // Update existing roles with any new default permissions
      const currentRoles = snapshot.val();
      const updates = {};
      
      Object.entries(DefaultPermissions).forEach(([role, defaultPerms]) => {
        if (!currentRoles[role]) {
          updates[role] = {
            name: role,
            permissions: defaultPerms,
            isSystem: true,
            createdAt: admin.database.ServerValue.TIMESTAMP,
            updatedAt: admin.database.ServerValue.TIMESTAMP
          };
        }
      });
      
      if (Object.keys(updates).length > 0) {
        await rolesRef.update(updates);
        console.log('Updated roles with new defaults');
      }
    }
  } catch (error) {
    console.error('Error initializing roles:', error);
    throw error;
  }
}

// Function to get all role definitions from Firebase
export async function getRoleDefinitions() {
  const app = await getFirebaseAdmin();
  if (!app) {
    throw new Error('Firebase Admin not initialized');
  }
  
  const db = getDatabase(app);
  const rolesRef = db.ref('role-definitions');
  
  try {
    const snapshot = await rolesRef.once('value');
    return snapshot.val() || InitialRoleConfigs;
  } catch (error) {
    console.error('Error fetching role definitions:', error);
    return InitialRoleConfigs;
  }
}

// Function to update role definition in Firebase
export async function updateRoleDefinition(roleName: string, permissions: string[]) {
  const app = await getFirebaseAdmin();
  if (!app) {
    throw new Error('Firebase Admin not initialized');
  }
  
  const db = getDatabase(app);
  const roleRef = db.ref(`role-definitions/${roleName}`);
  
  try {
    const snapshot = await roleRef.once('value');
    const currentRole = snapshot.val();
    
    if (!currentRole) {
      throw new Error(`Role ${roleName} not found`);
    }
    
    // For system roles, ensure core permissions are maintained
    if (currentRole.isSystem) {
      const defaultPerms = DefaultPermissions[roleName as keyof typeof DefaultPermissions];
      if (defaultPerms) {
        // Merge new permissions with default ones
        permissions = Array.from(new Set([...defaultPerms, ...permissions]));
      }
    }
    
    // Update role in Firebase
    const updateData = {
      permissions,
      updatedAt: admin.database.ServerValue.TIMESTAMP
    };
    
    await roleRef.update(updateData);
    console.log(`[ROLE-UPDATE] Updated role ${roleName} with permissions:`, permissions);
    
    // Update all users with this role
    const usersRef = db.ref('roles');
    const usersSnapshot = await usersRef.once('value');
    const users = usersSnapshot.val() || {};
    
    // Batch update for all users with this role
    const updates = {};
    Object.entries(users).forEach(([uid, userData]: [string, any]) => {
      if (userData.role === roleName) {
        updates[`roles/${uid}/permissions`] = permissions;
        updates[`roles/${uid}/updatedAt`] = admin.database.ServerValue.TIMESTAMP;
      }
    });
    
    if (Object.keys(updates).length > 0) {
      await db.ref().update(updates);
      console.log(`[ROLE-UPDATE] Updated permissions for ${Object.keys(updates).length} users`);
    }
    
    return { 
      name: roleName, 
      permissions,
      isSystem: currentRole.isSystem,
      updatedAt: Date.now()
    };
  } catch (error) {
    console.error(`Error updating role ${roleName}:`, error);
    throw error;
  }
}

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

    // Initialize roles in Firebase
    await initializeRoles(firebaseApp);
    
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
export async function updateUserRole(uid: string, roleType: keyof typeof RoleTypes, customPermissions?: string[]) {
  const app = await getFirebaseAdmin();
  if (!app) {
    throw new Error('Firebase Admin not initialized');
  }

  try {
    const db = getDatabase(app);
    const roleRef = db.ref(`roles/${uid}`);
    const timestamp = Date.now();
    
    // Get current role data if it exists
    const currentRoleSnapshot = await roleRef.once('value');
    const currentRole = currentRoleSnapshot.val();
    
    // Start with custom permissions if provided, otherwise use defaults
    let permissions: string[];
    
    if (customPermissions && customPermissions.length > 0) {
      // Get all valid permissions across all roles for validation
      const allValidPermissions = new Set(
        Object.values(DefaultPermissions).flat()
      );
      
      // Validate custom permissions
      const validCustomPermissions = customPermissions.filter(permission => 
        allValidPermissions.has(permission)
      );
      
      if (validCustomPermissions.length !== customPermissions.length) {
        console.warn('[ROLE-UPDATE] Some custom permissions were invalid and filtered out');
      }
      
      // Use custom permissions
      permissions = validCustomPermissions;
    } else {
      // Use default permissions if no custom permissions provided
      permissions = [...DefaultPermissions[roleType]];
    }
    
    // Ensure admin always has 'all' permission
    if (roleType === 'admin') {
      permissions = Array.from(new Set([...permissions, 'all']));
    }
    
    console.log(`[ROLE-UPDATE] Final permissions for ${roleType}:`, permissions);
    
    // For admin role, always include 'all' permission
    if (roleType === 'admin') {
      permissions = [...new Set([...permissions, 'all'])];
    }
    
    console.log(`[ROLE-UPDATE] Updating role for ${uid} to ${roleType} with permissions:`, permissions);
    
    // Update in Realtime Database
    const roleData = {
      role: roleType,
      permissions,
      updatedAt: timestamp,
      ...(roleType === 'admin' && { isAdmin: true })
    };
    
    // Update in Realtime Database
    await roleRef.set(roleData);
    console.log('[ROLE-UPDATE] Database update successful');

    // Update custom claims in Firebase Auth
    const customClaims = {
      role: roleType,
      permissions,
      updatedAt: timestamp,
      ...(roleType === 'admin' && { isAdmin: true })
    };
    
    await app.auth().setCustomUserClaims(uid, customClaims);
    console.log('[ROLE-UPDATE] Custom claims update successful');

    // Force token refresh
    await app.auth().revokeRefreshTokens(uid);
    console.log(`[ROLE-UPDATE] Role updated for user ${uid} to ${roleType}`);
    
    return { role: roleType, permissions };
  } catch (error) {
    console.error('[ROLE-UPDATE] Error updating user role:', error);
    throw error instanceof Error 
      ? new Error(`Failed to update user role: ${error.message}`)
      : new Error('Failed to update user role: Unknown error');
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