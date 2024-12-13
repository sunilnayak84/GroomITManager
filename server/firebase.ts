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
    // Check if roles are already initialized with retry logic
    let snapshot;
    let retries = 3;
    while (retries > 0) {
      try {
        snapshot = await rolesRef.once('value');
        break;
      } catch (error) {
        console.warn(`[ROLES] Failed to fetch roles (attempt ${4 - retries}/3):`, error);
        retries--;
        if (retries === 0) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const currentRoles = (snapshot?.val() || {}) as Record<string, Role>;
    const updates: Record<string, Role> = {};
    const timestamp = Date.now();

    console.log('[ROLES] Current roles in database:', Object.keys(currentRoles));
    
    // First, ensure all system roles exist with proper permissions
    for (const [roleName, roleConfig] of Object.entries(InitialRoleConfigs)) {
      try {
        const validatedPermissions = validatePermissions(roleConfig.permissions);
        if (validatedPermissions.length !== roleConfig.permissions.length) {
          console.error(`[ROLES] Invalid permissions in initial config for ${roleName}, using default permissions`);
          continue;
        }
        
        console.log(`[ROLES] Processing system role: ${roleName}`);
        updates[roleName] = {
          name: roleName,
          permissions: validatedPermissions,
          isSystem: true,
          createdAt: currentRoles[roleName]?.createdAt || timestamp,
          updatedAt: timestamp,
          description: currentRoles[roleName]?.description || ''
        };
      } catch (error) {
        console.error(`[ROLES] Error processing system role ${roleName}:`, error);
        // Continue with other roles even if one fails
        continue;
      }
    }

    // Then, preserve any existing custom roles
    for (const [roleName, roleData] of Object.entries(currentRoles)) {
      try {
        if (!InitialRoleConfigs[roleName as keyof typeof InitialRoleConfigs]) {
          console.log(`[ROLES] Processing custom role: ${roleName}`);
          const validatedPermissions = validatePermissions(roleData.permissions);
          updates[roleName] = {
            name: roleName,
            permissions: validatedPermissions,
            isSystem: false,
            description: roleData.description || '',
            createdAt: roleData.createdAt || timestamp,
            updatedAt: timestamp
          };
        }
      } catch (error) {
        console.error(`[ROLES] Error processing custom role ${roleName}:`, error);
        // Continue with other roles even if one fails
        continue;
      }
    }
    
    // Prepare the updates in a transaction-safe way
    if (Object.keys(updates).length > 0) {
      try {
        console.log('[ROLES] Applying updates for roles:', Object.keys(updates));
        
        // Use a transaction to ensure atomic updates
        await db.ref().transaction(async (current) => {
          if (!current) return updates;
          
          // Merge current roles with updates
          const merged = { ...current['role-definitions'], ...updates };
          return { 'role-definitions': merged };
        });
        
        console.log('[ROLES] Successfully initialized/updated roles');
        
        // Update all users with system roles to have the latest permissions
        let usersSnapshot;
        try {
          usersSnapshot = await db.ref('roles').once('value');
        } catch (error) {
          console.error('[ROLES] Error fetching users:', error);
          throw error;
        }
        
        const users = usersSnapshot.val() || {};
        const userUpdates: Record<string, any> = {};
        const timestamp = Date.now();
        
        // Process user updates
        for (const [uid, userData] of Object.entries(users)) {
          try {
            const roleType = (userData as any).role as keyof typeof InitialRoleConfigs;
            if (InitialRoleConfigs[roleType]) {
              userUpdates[`roles/${uid}/permissions`] = InitialRoleConfigs[roleType].permissions;
              userUpdates[`roles/${uid}/updatedAt`] = timestamp;
            }
          } catch (error) {
            console.error(`[ROLES] Error processing user ${uid}:`, error);
            continue;
          }
        }
        
        if (Object.keys(userUpdates).length > 0) {
          try {
            await db.ref().update(userUpdates);
            console.log('[ROLES] Updated permissions for existing users:', Object.keys(userUpdates).length);
          } catch (error) {
            console.error('[ROLES] Error updating user permissions:', error);
            // Continue despite user update errors
          }
        }
      } catch (error) {
        console.error('[ROLES] Error applying role updates:', error);
        throw error;
      }
    } else {
      console.log('[ROLES] No role updates needed');
    }
    
    // Verify roles were properly initialized with retries
    let verifySnapshot;
    let verifyRetries = 3;
    while (verifyRetries > 0) {
      try {
        verifySnapshot = await rolesRef.once('value');
        const roles = verifySnapshot.val();
        
        if (!roles) {
          throw new Error('No roles found after initialization');
        }
        
        console.log('[ROLES] Verification successful. Current roles:', Object.keys(roles));
        return roles;
      } catch (error) {
        console.error(`[ROLES] Verification attempt ${4 - verifyRetries}/3 failed:`, error);
        verifyRetries--;
        if (verifyRetries === 0) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    throw new Error('Failed to verify roles after initialization');
  } catch (error) {
    console.error('[ROLES] Fatal error initializing roles:', error);
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
    let privateKey = process.env.FIREBASE_PRIVATE_KEY || '';
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

    // Proper private key formatting
    if (privateKey) {
      privateKey = privateKey.replace(/\\n/g, '\n').replace(/^['"]|['"]$/g, '');
      if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
        privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----\n`;
      }
    }

    console.log('🟢 Firebase credentials check:', {
      projectId: projectId ? '✓' : '✗',
      clientEmail: clientEmail ? '✓' : '✗',
      privateKey: privateKey ? '✓' : '✗'
    });

    // In development mode, use default credentials if not provided
    if (isDevelopment) {
      if (!projectId || !clientEmail || !privateKey) {
        console.log('🟡 Using development credentials');
        return admin.initializeApp({
          credential: admin.credential.applicationDefault(),
          databaseURL: 'https://replit-5ac6a-default-rtdb.asia-southeast1.firebasedatabase.app/'
        });
      }
    } else {
      // Validate credentials in production
      if (!projectId || !clientEmail || !privateKey) {
        throw new Error('Missing required Firebase environment variables in production mode');
      }
    }

    // Initialize Firebase Admin SDK with proper error handling
    try {
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: projectId || 'development-project',
          clientEmail: clientEmail || 'development@example.com',
          privateKey: privateKey || '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC9QFi8Lg3Xy+Vj\n-----END PRIVATE KEY-----\n'
        }),
        databaseURL: 'https://replit-5ac6a-default-rtdb.asia-southeast1.firebasedatabase.app/'
      });

      console.log('🟢 Firebase Admin SDK initialized');

      // Test database connection with timeout
      const db = getDatabase(firebaseApp);
      const connectionTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database connection timeout')), 5000)
      );
      
      await Promise.race([
        db.ref('.info/connected').once('value'),
        connectionTimeout
      ]);

      console.log('🟢 Firebase Realtime Database connected');

      // Initialize roles with retries
      let retries = 3;
      while (retries > 0) {
        try {
          await initializeRoles(firebaseApp);
          console.log('🟢 Roles initialized successfully');
          break;
        } catch (error) {
          console.error(`⚠️ Role initialization attempt ${4 - retries} failed:`, error);
          retries--;
          if (retries === 0) throw error;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      if (isDevelopment) {
        await setupDevelopmentAdmin(firebaseApp);
      }

      return firebaseApp;
    } catch (initError) {
      console.error('🔴 Firebase initialization error:', initError);
      throw initError;
    }
  } catch (error) {
    console.error('🔴 Fatal Firebase Admin error:', error);
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
    console.warn('[USER-ROLE] Firebase Admin not initialized');
    return null;
  }

  try {
    const db = getDatabase(app);
    console.log('[USER-ROLE] Fetching roles for user:', uid);
    
    // Get all role definitions first
    const roleDefsSnapshot = await db.ref('role-definitions').once('value');
    const roleDefs = roleDefsSnapshot.val() || {};
    
    // Get user's role
    const userRoleSnapshot = await db.ref(`roles/${uid}`).once('value');
    const userData = userRoleSnapshot.val();

    // Transform role definitions into a list of available roles
    const availableRoles = Object.entries(roleDefs).map(([name, roleData]: [string, any]) => {
      const isSystemRole = name in InitialRoleConfigs;
      let permissions: Permission[] = [];

      // For system roles, use default permissions as base
      if (isSystemRole) {
        permissions = [...DefaultPermissions[name as keyof typeof RoleTypes]];
      }

      // Add any additional permissions from role definition
      if (Array.isArray(roleData.permissions)) {
        permissions = Array.from(new Set([...permissions, ...validatePermissions(roleData.permissions)]));
      }

      return {
        name,
        isSystem: roleData.isSystem || isSystemRole,
        permissions,
        description: roleData.description || ''
      };
    });

    console.log('[USER-ROLE] Available roles:', availableRoles.map(r => r.name));

    if (!userData) {
      console.warn(`[USER-ROLE] No role found for user ${uid}, using default staff role`);
      return {
        role: RoleTypes.staff,
        permissions: DefaultPermissions[RoleTypes.staff],
        availableRoles
      };
    }

    // Get the user's assigned role
    const assignedRole = roleDefs[userData.role];
    if (!assignedRole) {
      console.warn(`[USER-ROLE] Invalid role ${userData.role} assigned to user ${uid}, using default staff role`);
      return {
        role: RoleTypes.staff,
        permissions: DefaultPermissions[RoleTypes.staff],
        availableRoles
      };
    }

    // Determine final permissions for the user
    const isSystemRole = userData.role in InitialRoleConfigs;
    let finalPermissions: Permission[] = [];

    // For system roles, start with default permissions
    if (isSystemRole) {
      finalPermissions = [...DefaultPermissions[userData.role as keyof typeof RoleTypes]];
    }

    // Add any custom permissions from the role definition
    if (Array.isArray(assignedRole.permissions)) {
      finalPermissions = Array.from(new Set([...finalPermissions, ...validatePermissions(assignedRole.permissions)]));
    }

    // Add any user-specific permissions
    if (Array.isArray(userData.permissions)) {
      finalPermissions = Array.from(new Set([...finalPermissions, ...validatePermissions(userData.permissions)]));
    }

    console.log('[USER-ROLE] Resolved role data:', {
      role: userData.role,
      permissionCount: finalPermissions.length
    });

    return {
      role: userData.role,
      permissions: finalPermissions,
      availableRoles
    };
  } catch (error) {
    console.error('[USER-ROLE] Error fetching user role:', error);
    return null;
  }
}

// Update user role with better error handling and validation
export async function updateUserRole(uid: string, roleType: keyof typeof RoleTypes, customPermissions?: Permission[]) {
  console.log('[ROLE-UPDATE] Starting role update for user:', { uid, roleType, customPermissions });
  
  const app = await getFirebaseAdmin();
  if (!app) {
    throw new Error('Firebase Admin not initialized');
  }

  try {
    const db = getDatabase(app);
    const auth = app.auth();
    const roleRef = db.ref(`roles/${uid}`);
    const timestamp = Date.now();

    // Validate role type
    if (!Object.values(RoleTypes).includes(roleType)) {
      throw new Error(`Invalid role type: ${roleType}`);
    }

    // Get role definition to ensure it exists
    const roleDefsRef = db.ref('role-definitions');
    const roleDefsSnapshot = await roleDefsRef.once('value');
    const roleDefs = roleDefsSnapshot.val() || {};
    
    if (!roleDefs[roleType]) {
      throw new Error(`Role type ${roleType} not found in definitions`);
    }

    // Determine permissions
    let permissions: Permission[];
    if (customPermissions && customPermissions.length > 0) {
      permissions = validatePermissions(customPermissions);
      if (permissions.length !== customPermissions.length) {
        const invalidPerms = customPermissions.filter(p => !isValidPermission(p));
        console.warn('[ROLE-UPDATE] Invalid permissions filtered:', invalidPerms);
      }
    } else {
      permissions = [...DefaultPermissions[roleType]];
    }

    // Special handling for admin role
    if (roleType === RoleTypes.admin) {
      permissions = Array.from(new Set([...permissions, 'all' as Permission]));
    }

    // Prepare update data
    const roleData = {
      role: roleType,
      permissions,
      updatedAt: timestamp,
      ...(roleType === RoleTypes.admin && { isAdmin: true })
    };

    // Transaction to ensure atomic updates
    await db.ref().update({
      [`roles/${uid}`]: roleData
    });

    // Update auth claims
    await auth.setCustomUserClaims(uid, {
      role: roleType,
      permissions,
      updatedAt: timestamp,
      ...(roleType === RoleTypes.admin && { isAdmin: true })
    });

    // Force token refresh
    await auth.revokeRefreshTokens(uid);

    console.log('[ROLE-UPDATE] Successfully updated role for user:', {
      uid,
      role: roleType,
      permissionCount: permissions.length
    });

    return {
      role: roleType,
      permissions,
      timestamp,
      success: true
    };
  } catch (error) {
    console.error('[ROLE-UPDATE] Error:', error);
    throw error instanceof Error 
      ? new Error(`Role update failed: ${error.message}`)
      : new Error('Role update failed: Unknown error');
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