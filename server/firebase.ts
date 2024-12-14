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
    permissions: DefaultPermissions.admin,
    isSystem: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  [RoleTypes.manager]: {
    name: 'manager',
    permissions: DefaultPermissions.manager,
    isSystem: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  [RoleTypes.staff]: {
    name: 'staff',
    permissions: DefaultPermissions.staff,
    isSystem: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  [RoleTypes.receptionist]: {
    name: 'receptionist',
    permissions: DefaultPermissions.receptionist,
    isSystem: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
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
    // Get Firebase credentials from environment variables
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '';
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

    // Development mode handling
    if (isDevelopment) {
      try {
        console.log('🟡 Attempting to initialize Firebase in development mode');
        firebaseApp = admin.initializeApp({
          credential: admin.credential.applicationDefault(),
          databaseURL: 'https://replit-5ac6a-default-rtdb.asia-southeast1.firebasedatabase.app/'
        });
        console.log('🟢 Firebase initialized successfully in development mode');
        return firebaseApp;
      } catch (devError) {
        console.warn('⚠️ Failed to initialize with application default credentials:', devError);
        if (!projectId || !clientEmail || !privateKey) {
          console.log('🟡 Continuing with mock Firebase in development');
          return null;
        }
      }
    } else {
      // Validate credentials in production
      if (!projectId || !clientEmail || !privateKey) {
        throw new Error('Missing required Firebase environment variables in production mode');
      }
    }

    // Initialize Firebase Admin SDK
    console.log('🟢 Attempting to initialize Firebase Admin SDK');
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey
      }),
      databaseURL: 'https://replit-5ac6a-default-rtdb.asia-southeast1.firebasedatabase.app/'
    });

    // Test database connection
    const db = getDatabase(firebaseApp);
    await db.ref('.info/connected').once('value');
    console.log('🟢 Firebase Realtime Database connected successfully');

    // Initialize roles
    await initializeRoles(firebaseApp);
    console.log('🟢 Roles initialized successfully');

    if (isDevelopment) {
      await setupDevelopmentAdmin(firebaseApp);
    }

    return firebaseApp;
  } catch (error) {
    console.error('🔴 Firebase initialization error:', error);
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

// Initialize roles in Firebase
async function initializeRoles(app: admin.app.App) {
  const db = getDatabase(app);
  const rolesRef = db.ref('role-definitions');
  
  try {
    console.log('[ROLES] Starting role initialization...');
    
    // Check if roles exist
    const snapshot = await rolesRef.once('value');
    const currentRoles = snapshot.val() || {};
    const updates: Record<string, Role> = {};
    const timestamp = Date.now();

    // Initialize system roles
    for (const [roleName, roleConfig] of Object.entries(InitialRoleConfigs)) {
      updates[roleName] = {
        ...roleConfig,
        updatedAt: timestamp
      };
    }

    // Preserve custom roles
    for (const [roleName, roleData] of Object.entries(currentRoles)) {
      if (!InitialRoleConfigs[roleName as keyof typeof InitialRoleConfigs]) {
        updates[roleName] = {
          ...(roleData as Role),
          updatedAt: timestamp
        };
      }
    }

    // Apply updates
    await rolesRef.set(updates);
    console.log('[ROLES] Successfully initialized/updated roles');
    return updates;
  } catch (error) {
    console.error('[ROLES] Error initializing roles:', error);
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
    } catch {
      adminUser = await auth.createUser({
        email: adminEmail,
        password: 'admin123',
        emailVerified: true,
        displayName: 'Admin User'
      });
    }

    // Set admin role
    const roleRef = db.ref(`roles/${adminUser.uid}`);
    const timestamp = Date.now();
    
    const adminData = {
      role: RoleTypes.admin,
      permissions: DefaultPermissions.admin,
      isAdmin: true,
      updatedAt: timestamp
    };
    
    await roleRef.set(adminData);
    await auth.setCustomUserClaims(adminUser.uid, adminData);
    console.log('🟢 Development admin setup complete');
    
    return adminUser;
  } catch (error) {
    console.error('Development admin setup failed:', error);
    throw error;
  }
}

// Get user role from Realtime Database
export async function getUserRole(uid: string) {
  const app = await getFirebaseAdmin();
  if (!app) {
    console.warn('[USER-ROLE] Firebase Admin not initialized');
    return null;
  }

  try {
    const db = getDatabase(app);
    const userRoleSnapshot = await db.ref(`roles/${uid}`).once('value');
    const userData = userRoleSnapshot.val();

    if (!userData) {
      console.warn(`[USER-ROLE] No role found for user ${uid}`);
      return null;
    }

    return {
      role: userData.role,
      permissions: validatePermissions(userData.permissions)
    };
  } catch (error) {
    console.error('[USER-ROLE] Error fetching user role:', error);
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
    const auth = app.auth();
    const timestamp = Date.now();

    const roleData = {
      role: roleType,
      permissions: DefaultPermissions[roleType],
      updatedAt: timestamp,
      ...(roleType === RoleTypes.admin && { isAdmin: true })
    };

    await db.ref(`roles/${uid}`).set(roleData);
    await auth.setCustomUserClaims(uid, roleData);

    return {
      role: roleType,
      permissions: DefaultPermissions[roleType],
      timestamp,
      success: true
    };
  } catch (error) {
    console.error('[ROLE-UPDATE] Error:', error);
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

// Function to update role definition in Firebase with improved validation and atomic updates
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
    // Get current role in a transaction to ensure atomicity
    const snapshot = await roleRef.once('value');
    const currentRole = snapshot.val();
    
    if (!currentRole) {
      throw new Error(`Role ${roleName} not found`);
    }
    
    // Prevent updates to system roles except by adding permissions
    if (currentRole.isSystem && roleName in RoleTypes) {
      const defaultPerms = DefaultPermissions[roleName as keyof typeof RoleTypes];
      const missingRequired = defaultPerms.filter(p => !permissions.includes(p));
      
      if (missingRequired.length > 0) {
        throw new Error(
          `Cannot remove required permissions from system role: ${missingRequired.join(', ')}`
        );
      }
    }
    
    // Validate all permissions
    const validatedPermissions = validatePermissions(permissions);
    if (validatedPermissions.length !== permissions.length) {
      const invalidPerms = permissions.filter(p => !isValidPermission(p));
      throw new Error(`Invalid permissions provided: ${invalidPerms.join(', ')}`);
    }
    
    // For system roles, merge with default permissions
    let finalPermissions: Permission[] = [...validatedPermissions];
    if (currentRole.isSystem && roleName in DefaultPermissions) {
      const defaultPerms = DefaultPermissions[roleName as keyof typeof RoleTypes];
      finalPermissions = Array.from(new Set([...defaultPerms, ...validatedPermissions]));
    }
    
    const timestamp = Date.now();
    
    // Prepare role update
    const updatedRole = {
      name: roleName,
      permissions: finalPermissions,
      isSystem: currentRole.isSystem || false,
      description: currentRole.description || '',
      updatedAt: timestamp
    };
    
    // Start a multi-path update transaction
    const updates: Record<string, any> = {
      [`role-definitions/${roleName}`]: updatedRole,
      [`role-history/${roleName}/${timestamp}`]: {
        previousPermissions: currentRole.permissions,
        newPermissions: finalPermissions,
        timestamp,
        type: 'update'
      }
    };
    
    // Get all users with this role
    const usersSnapshot = await db.ref('roles').orderByChild('role').equalTo(roleName).once('value');
    const users = usersSnapshot.val() || {};
    
    // Add user updates to the transaction
    Object.entries(users).forEach(([uid, _]) => {
      updates[`roles/${uid}/permissions`] = finalPermissions;
      updates[`roles/${uid}/updatedAt`] = timestamp;
    });
    
    // Execute all updates in a single transaction
    await db.ref().update(updates);
    
    // Update custom claims for affected users
    const updatePromises = Object.keys(users).map(uid =>
      app.auth().setCustomUserClaims(uid, {
        role: roleName,
        permissions: finalPermissions,
        updatedAt: timestamp
      })
    );
    
    await Promise.all(updatePromises);
    
    console.log(`[ROLE-UPDATE] Successfully updated role ${roleName} and ${Object.keys(users).length} users`);
    
    return {
      name: roleName,
      permissions: finalPermissions,
      isSystem: currentRole.isSystem,
      updatedAt: timestamp,
      affectedUsers: Object.keys(users).length
    };
  } catch (error) {
    console.error(`[ROLE-UPDATE] Error updating role ${roleName}:`, error);
    throw error instanceof Error
      ? new Error(`Role update failed: ${error.message}`)
      : new Error('Role update failed: Unknown error');
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