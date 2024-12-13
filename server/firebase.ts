import admin from 'firebase-admin';
import { getDatabase } from 'firebase-admin/database';

// Define role types (lowercase to match database)
export const RoleTypes = {
  admin: 'admin',
  manager: 'manager',
  staff: 'staff',
  receptionist: 'receptionist'
} as const;

// Define all possible permissions as const array first
export const ALL_PERMISSIONS = [
  'manage_appointments', 'view_appointments', 'create_appointments', 'cancel_appointments',
  'manage_customers', 'view_customers', 'create_customers', 'edit_customer_info',
  'manage_services', 'view_services', 'create_services', 'edit_services',
  'manage_inventory', 'view_inventory', 'update_stock', 'manage_consumables',
  'manage_staff_schedule', 'view_staff_schedule', 'manage_own_schedule',
  'view_analytics', 'view_reports', 'view_financial_reports', 'all'
] as const;

// Create a union type of all permissions
export type Permission = typeof ALL_PERMISSIONS[number];

// Create a Set of valid permissions for faster lookups
const VALID_PERMISSIONS = new Set(ALL_PERMISSIONS);

// Helper function to validate if a string is a valid permission
export function isValidPermission(permission: unknown): permission is Permission {
  return typeof permission === 'string' && VALID_PERMISSIONS.has(permission as Permission);
}

// Helper function to validate an array of permissions
export function validatePermissions(permissions: unknown[]): Permission[] {
  if (!Array.isArray(permissions)) {
    console.warn('[PERMISSIONS] Invalid permissions format:', permissions);
    return [];
  }
  
  const validPermissions = permissions.filter((p): p is Permission => {
    const isValid = isValidPermission(p);
    if (!isValid) {
      console.warn('[PERMISSIONS] Invalid permission:', p);
    }
    return isValid;
  });
  
  console.log('[PERMISSIONS] Validated permissions:', validPermissions);
  return validPermissions;
}

// Helper function to ensure type safety when getting permissions
export function ensureValidPermissions(permissions: unknown): Permission[] {
  if (!Array.isArray(permissions)) {
    console.warn('[PERMISSIONS] Invalid permissions input:', permissions);
    return [];
  }
  return validatePermissions(permissions);
}

// Helper to ensure type safety when accessing DefaultPermissions
export function getDefaultPermissions(role: keyof typeof RoleTypes): Permission[] {
  return DefaultPermissions[role];
}

// Define role structure
export interface Role {
  name: string;
  permissions: Permission[];
  isSystem?: boolean;
  description?: string;
  createdAt?: number;
  updatedAt?: number;
}

// Define default permissions for each role
export const DefaultPermissions: Record<keyof typeof RoleTypes, Permission[]> = {
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
export const InitialRoleConfigs: Record<keyof typeof RoleTypes, Role> = {
  [RoleTypes.admin]: {
    name: 'admin',
    permissions: [
      'manage_appointments', 'view_appointments', 'create_appointments', 'cancel_appointments',
      'manage_customers', 'view_customers', 'create_customers', 'edit_customer_info',
      'manage_services', 'view_services', 'create_services', 'edit_services',
      'manage_inventory', 'view_inventory', 'update_stock', 'manage_consumables',
      'manage_staff_schedule', 'view_staff_schedule', 'manage_own_schedule',
      'view_analytics', 'view_reports', 'view_financial_reports', 'all'
    ] as Permission[],
    isSystem: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  [RoleTypes.manager]: {
    name: 'manager',
    permissions: [
      'view_appointments', 'create_appointments', 'cancel_appointments',
      'view_customers', 'create_customers', 'edit_customer_info',
      'view_services', 'view_inventory', 'update_stock',
      'manage_staff_schedule', 'view_staff_schedule', 'manage_own_schedule',
      'view_analytics'
    ] as Permission[],
    isSystem: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  [RoleTypes.staff]: {
    name: 'staff',
    permissions: [
      'view_appointments', 'create_appointments',
      'view_customers', 'create_customers',
      'view_services', 'view_inventory',
      'manage_own_schedule'
    ] as Permission[],
    isSystem: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  [RoleTypes.receptionist]: {
    name: 'receptionist',
    permissions: [
      'view_appointments', 'create_appointments',
      'view_customers', 'create_customers',
      'view_services'
    ] as Permission[],
    isSystem: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
};

// Function to initialize roles in Firebase
async function initializeRoles(app: admin.app.App) {
  const db = getDatabase(app);
  const rolesRef = db.ref('role-definitions');
  
  console.log('[ROLES] Starting role initialization...');
  
  try {
    // Check if roles are already initialized
    const snapshot = await rolesRef.once('value');
    const currentRoles = snapshot.val() || {};
    const updates: Record<string, Role> = {};

    console.log('[ROLES] Current roles in database:', Object.keys(currentRoles));
    
    // Always ensure default roles exist with proper permissions
    Object.entries(InitialRoleConfigs).forEach(([roleName, roleConfig]) => {
      const validatedPermissions = validatePermissions(roleConfig.permissions);
      if (validatedPermissions.length !== roleConfig.permissions.length) {
        console.error(`[ROLES] Invalid permissions in initial config for ${roleName}`);
        return;
      }
      
      // Always update system roles to ensure they have the latest permissions
      console.log(`[ROLES] Checking role: ${roleName}`);
      updates[roleName] = {
        name: roleName,
        permissions: validatedPermissions,
        isSystem: true,
        createdAt: currentRoles[roleName]?.createdAt || Date.now(),
        updatedAt: Date.now()
      };
    });
    
    if (Object.keys(updates).length > 0) {
      await rolesRef.update(updates);
      console.log('[ROLES] Successfully initialized/updated roles:', Object.keys(updates));
      
      // Update all users with system roles to have the latest permissions
      const usersRef = db.ref('roles');
      const usersSnapshot = await usersRef.once('value');
      const users = usersSnapshot.val() || {};
      
      const userUpdates: Record<string, any> = {};
      Object.entries(users).forEach(([uid, userData]: [string, any]) => {
        const roleType = userData.role as keyof typeof InitialRoleConfigs;
        if (InitialRoleConfigs[roleType]) {
          userUpdates[`roles/${uid}/permissions`] = InitialRoleConfigs[roleType].permissions;
          userUpdates[`roles/${uid}/updatedAt`] = admin.database.ServerValue.TIMESTAMP;
        }
      });
      
      if (Object.keys(userUpdates).length > 0) {
        await db.ref().update(userUpdates);
        console.log('[ROLES] Updated permissions for existing users');
      }
    } else {
      console.log('[ROLES] All default roles already exist');
    }
    
    // Verify roles were properly initialized
    const verifySnapshot = await rolesRef.once('value');
    const roles = verifySnapshot.val();
    
    if (!roles) {
      throw new Error('Failed to initialize roles in Firebase');
    }
    
    console.log('[ROLES] Current roles in Firebase:', Object.keys(roles));
    return roles;
  } catch (error) {
    console.error('[ROLES] Error initializing roles:', error);
    throw error;
  }
}

// Function to get all role definitions from Firebase
export async function getRoleDefinitions(): Promise<Record<string, Role>> {
  console.log('[ROLES] Fetching role definitions...');
  
  const app = await getFirebaseAdmin();
  if (!app) {
    console.warn('[ROLES] Firebase Admin not initialized, using initial configs');
    return InitialRoleConfigs;
  }
  
  const db = getDatabase(app);
  const rolesRef = db.ref('role-definitions');
  
  try {
    // Initialize roles first to ensure we have the latest definitions
    await initializeRoles(app);
    console.log('[ROLES] Roles initialized, fetching current definitions');
    
    const snapshot = await rolesRef.once('value');
    const roles = snapshot.val();
    
    if (!roles) {
      console.log('[ROLES] No roles found in database, using initial configs');
      // Save initial configs to database
      await rolesRef.set(InitialRoleConfigs);
      return InitialRoleConfigs;
    }
    
    // Transform roles to ensure consistent format and type safety
    const transformedRoles = Object.entries(roles).reduce<Record<string, Role>>((acc, [name, role]: [string, any]) => {
      // Validate permissions and ensure they are of type Permission[]
      const validPermissions = validatePermissions(Array.isArray(role.permissions) ? role.permissions : []);
      
      // For system roles, merge with default permissions
      let finalPermissions = validPermissions;
      if (role.isSystem && name in DefaultPermissions) {
        const defaultPerms = DefaultPermissions[name as keyof typeof RoleTypes];
        finalPermissions = Array.from(new Set([...defaultPerms, ...validPermissions]));
      }
      
      acc[name] = {
        name,
        permissions: finalPermissions,
        isSystem: role.isSystem || false,
        description: role.description || '',
        createdAt: role.createdAt || Date.now(),
        updatedAt: role.updatedAt || Date.now()
      };
      return acc;
    }, {});
    
    console.log('[ROLES] Successfully fetched roles:', Object.keys(transformedRoles));
    return transformedRoles;
  } catch (error) {
    console.error('[ROLES] Error fetching role definitions:', error);
    console.warn('[ROLES] Using initial configs as fallback');
    return InitialRoleConfigs;
  }
}

// Function to update role definition in Firebase
export async function updateRoleDefinition(roleName: string, permissions: Permission[]) {
  console.log('[ROLE-UPDATE] Starting role update for:', roleName);
  const app = await getFirebaseAdmin();
  if (!app) {
    throw new Error('Firebase Admin not initialized');
  }
  
  const db = getDatabase(app);
  const roleRef = db.ref(`role-definitions/${roleName}`);
  const roleHistoryRef = db.ref(`role-history/${roleName}`);
  
  try {
    const snapshot = await roleRef.once('value');
    const currentRole = snapshot.val();
    
    if (!currentRole) {
      throw new Error(`Role ${roleName} not found`);
    }
    
    // Validate incoming permissions
    const validatedPermissions = validatePermissions(permissions);
    if (validatedPermissions.length !== permissions.length) {
      console.warn('[ROLE-UPDATE] Some permissions were invalid:', 
        permissions.filter(p => !isValidPermission(p)));
      throw new Error('Invalid permissions provided');
    }
    
    // For system roles, ensure core permissions are maintained
    let finalPermissions: Permission[] = [...validatedPermissions];
    if (currentRole.isSystem && roleName in DefaultPermissions) {
      const defaultPerms = DefaultPermissions[roleName as keyof typeof DefaultPermissions];
      const combinedPermissions = new Set([...defaultPerms, ...validatedPermissions]);
      finalPermissions = Array.from(combinedPermissions) as Permission[];
      console.log('[ROLE-UPDATE] Merged with default permissions:', finalPermissions);
    }
    
    const timestamp = Date.now();
    
    // Store previous state in history
    await roleHistoryRef.push({
      permissions: currentRole.permissions,
      updatedAt: currentRole.updatedAt,
      timestamp
    });
    
    // Update role in Firebase
    const updateData = {
      name: roleName,
      permissions: finalPermissions,
      isSystem: currentRole.isSystem || false,
      updatedAt: timestamp
    };
    
    console.log('[ROLE-UPDATE] Saving role data:', updateData);
    await roleRef.update(updateData);
    console.log(`[ROLE-UPDATE] Updated role ${roleName} with permissions:`, finalPermissions);
    
    // Update all users with this role
    const usersRef = db.ref('roles');
    const usersSnapshot = await usersRef.once('value');
    const users = usersSnapshot.val() || {};
    
    const userUpdates: Record<string, any> = {};
    Object.entries(users).forEach(([uid, userData]: [string, any]) => {
      if (userData.role === roleName) {
        userUpdates[`roles/${uid}/permissions`] = finalPermissions;
        userUpdates[`roles/${uid}/updatedAt`] = admin.database.ServerValue.TIMESTAMP;
      }
    });
    
    if (Object.keys(userUpdates).length > 0) {
      await db.ref().update(userUpdates);
      console.log(`[ROLE-UPDATE] Updated permissions for ${Object.keys(userUpdates).length} users`);
    }
    
    return { 
      name: roleName, 
      permissions: finalPermissions,
      isSystem: currentRole.isSystem,
      updatedAt: timestamp
    };
  } catch (error) {
    console.error(`[ROLE-UPDATE] Error updating role ${roleName}:`, error);
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
export async function updateUserRole(uid: string, roleType: keyof typeof RoleTypes, customPermissions?: Permission[]) {
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
    let permissions: Permission[];
    
    if (customPermissions && customPermissions.length > 0) {
      // Validate custom permissions
      permissions = validatePermissions(customPermissions);
      
      if (permissions.length !== customPermissions.length) {
        console.warn('[ROLE-UPDATE] Some custom permissions were invalid and filtered out');
        console.warn('Invalid permissions:', 
          customPermissions.filter(p => !VALID_PERMISSIONS.has(p as Permission))
        );
      }
    } else {
      // Use default permissions if no custom permissions provided
      permissions = [...DefaultPermissions[roleType]];
    }
    
    // Ensure admin always has 'all' permission
    if (roleType === 'admin') {
      permissions = Array.from(new Set([...permissions, 'all' as Permission]));
    }
    
    console.log(`[ROLE-UPDATE] Final permissions for ${roleType}:`, permissions);
    
    // For admin role, always include 'all' permission
    if (roleType === 'admin') {
      // Ensure we're only adding valid Permission types
      const adminPermissions: Permission[] = Array.from(new Set([...permissions, 'all' as Permission]));
      permissions = adminPermissions;
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
    
    // Ensure admin permissions are properly validated
    const adminPermissions = validatePermissions(DefaultPermissions[RoleTypes.admin]);
    if (adminPermissions.length === 0) {
      throw new Error('Invalid admin permissions configuration');
    }
    
    const adminData = {
      role: RoleTypes.admin,
      permissions: adminPermissions,
      isAdmin: true,
      updatedAt: timestamp
    };
    
    // Validate admin permissions
    if (!Array.isArray(adminPermissions) || adminPermissions.length === 0) {
      console.error('[ROLES] Invalid admin permissions:', adminPermissions);
      throw new Error('Invalid admin permissions configuration');
    }
    
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
        permissions: roleData?.permissions || DefaultPermissions[role as keyof typeof RoleTypes] || [],
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