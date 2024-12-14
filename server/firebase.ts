import admin from 'firebase-admin';
import { getDatabase } from 'firebase-admin/database';

// Define role types (lowercase to match database)
export const RoleTypes = {
  admin: 'admin',
  manager: 'manager',
  staff: 'staff',
  receptionist: 'receptionist'
} as const;

// Define role hierarchy (higher roles inherit permissions from lower roles)
export const RoleHierarchy: Record<keyof typeof RoleTypes, Array<keyof typeof RoleTypes>> = {
  admin: ['manager', 'staff', 'receptionist'],
  manager: ['staff', 'receptionist'],
  staff: ['receptionist'],
  receptionist: []
};

// Define hierarchy levels for proper inheritance
export const RoleHierarchyLevels: Record<keyof typeof RoleTypes, number> = {
  admin: 3,
  manager: 2,
  staff: 1,
  receptionist: 0
};

// Helper function to get inherited roles with proper type checking and hierarchy level validation
export function getInheritedRoles(role: keyof typeof RoleTypes): Array<keyof typeof RoleTypes> {
  const currentLevel = RoleHierarchyLevels[role];
  const allInherited = new Set<keyof typeof RoleTypes>();
  
  // Helper function for recursive role inheritance with level checking
  function addInheritedRoles(currentRole: keyof typeof RoleTypes) {
    const directInherited = RoleHierarchy[currentRole];
    
    directInherited.forEach(inheritedRole => {
      if (inheritedRole in RoleTypes) {
        const safeRole = inheritedRole as keyof typeof RoleTypes;
        const inheritedLevel = RoleHierarchyLevels[safeRole];
        
        // Only inherit if the level is lower (prevents circular inheritance)
        if (inheritedLevel < RoleHierarchyLevels[currentRole] && !allInherited.has(safeRole)) {
          allInherited.add(safeRole);
          // Recursively add inherited roles
          addInheritedRoles(safeRole);
        }
      }
    });
  }
  
  // Start the recursion with the initial role
  addInheritedRoles(role);
  
  // Sort inherited roles by hierarchy level (highest to lowest)
  return Array.from(allInherited).sort((a, b) => RoleHierarchyLevels[b] - RoleHierarchyLevels[a]);
}

// Helper function to validate role hierarchy
export function validateRoleHierarchy(role: keyof typeof RoleTypes): boolean {
  const inheritedRoles = getInheritedRoles(role);
  const currentLevel = RoleHierarchyLevels[role];
  
  // Ensure all inherited roles have lower levels
  return inheritedRoles.every(inheritedRole => 
    RoleHierarchyLevels[inheritedRole] < currentLevel
  );
}

// Define all possible permissions
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
export function validatePermissions(permissions: unknown[], role?: keyof typeof RoleTypes): Permission[] {
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

  if (role) {
    // Include inherited permissions from role hierarchy
    const inheritedRoles = getInheritedRoles(role);
    const inheritedPermissions = inheritedRoles.flatMap(r => DefaultPermissions[r]);
    validPermissions.push(...inheritedPermissions);
  }
  
  // Remove duplicates
  return Array.from(new Set(validPermissions));
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
};

// Define role structure with hierarchy support
export interface Role {
  name: string;
  permissions: Permission[];
  isSystem?: boolean;
  description?: string;
  createdAt?: number;
  updatedAt?: number;
  inheritsFrom?: Array<keyof typeof RoleTypes>;
  level?: number; // Used for hierarchy level determination
  customClaims?: Record<string, unknown>; // Additional Firebase custom claims
}

// Helper type for role validation
export type ValidRole = {
  name: keyof typeof RoleTypes;
  permissions: Permission[];
  inheritsFrom: Array<keyof typeof RoleTypes>;
  level: number;
};

// Initialize Firebase Admin
let firebaseApp: admin.app.App | null = null;

export async function initializeFirebaseAdmin(): Promise<admin.app.App | null> {
  if (firebaseApp) {
    return firebaseApp;
  }

  const isDevelopment = process.env.NODE_ENV === 'development';
  console.log('🟢 Initializing Firebase in', isDevelopment ? 'development' : 'production', 'mode');

  try {
    // Validate required environment variables
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY || '';

    // Log configuration status
    console.log('🟢 Firebase configuration check:', {
      projectId: projectId ? '✓' : '✗',
      clientEmail: clientEmail ? '✓' : '✗',
      privateKey: privateKey ? '✓' : '✗',
      isDevelopment
    });

    // Validate credentials
    if (!projectId || !clientEmail || !privateKey) {
      throw new Error('Missing required Firebase environment variables');
    }

    // Format private key
    privateKey = privateKey.replace(/\\n/g, '\n').replace(/^['"]|['"]$/g, '');
    if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
      privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----\n`;
    }

    // Initialize Firebase Admin SDK
    console.log('🟢 Attempting to initialize Firebase Admin SDK');
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey
      }),
      databaseURL: `https://${projectId}-default-rtdb.asia-southeast1.firebasedatabase.app`
    });

    console.log('🟢 Firebase Admin SDK initialized successfully');
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

// Update user role with hierarchy support and strict validation
export async function updateUserRole(uid: string, roleType: keyof typeof RoleTypes): Promise<void> {
  console.log('[ROLE-UPDATE] Starting role update for user:', { uid, roleType });
  
  const app = await getFirebaseAdmin();
  if (!app) {
    throw new Error('Firebase Admin not initialized');
  }

  const db = getDatabase(app);
  const timestamp = Date.now();

  try {
    // Validate role type
    if (!Object.values(RoleTypes).includes(roleType)) {
      throw new Error(`Invalid role type: ${roleType}`);
    }

    // Validate role hierarchy
    if (!validateRoleHierarchy(roleType)) {
      throw new Error(`Invalid role hierarchy for role: ${roleType}`);
    }

    // Get inherited roles
    const inheritedRoles = getInheritedRoles(roleType);
    
    // Combine permissions from all inherited roles
    const basePermissions = DefaultPermissions[roleType];
    const inheritedPermissions = inheritedRoles.flatMap(role => DefaultPermissions[role]);
    const allPermissions = Array.from(new Set([...basePermissions, ...inheritedPermissions]));

    // Special handling for admin role
    const roleData = {
      role: roleType,
      permissions: allPermissions,
      inheritedRoles,
      hierarchyLevel: RoleHierarchyLevels[roleType],
      updatedAt: timestamp,
      ...(roleType === RoleTypes.admin && { isAdmin: true })
    };

    // Update user's role and permissions
    await db.ref(`roles/${uid}`).update(roleData);
    
    // Update custom claims with hierarchy information
    await app.auth().setCustomUserClaims(uid, {
      role: roleType,
      permissions: allPermissions,
      inheritedRoles,
      hierarchyLevel: RoleHierarchyLevels[roleType],
      updatedAt: timestamp
    });

    console.log('[ROLE-UPDATE] Successfully updated role for user:', uid, {
      role: roleType,
      inheritedRoles,
      permissionCount: allPermissions.length
    });
  } catch (error) {
    console.error('[ROLE-UPDATE] Error updating user role:', error);
    throw error instanceof Error 
      ? new Error(`Failed to update user role: ${error.message}`)
      : new Error('Failed to update user role: Unknown error');
  }
}

// Function to initialize roles in Firebase
async function initializeRoles(app: admin.app.App) {
  const db = getDatabase(app);
  const rolesRef = db.ref('role-definitions');
  
  console.log('[ROLES] Starting role initialization...');
  
  try {
    const snapshot = await rolesRef.once('value');
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
        const usersSnapshot = await db.ref('roles').once('value');
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
    
    // Verify roles were properly initialized
    const verifySnapshot = await rolesRef.once('value');
    const roles = verifySnapshot.val();
    
    if (!roles) {
      throw new Error('No roles found after initialization');
    }
    
    console.log('[ROLES] Verification successful. Current roles:', Object.keys(roles));
    return roles;
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

// Get all permissions for a role including inherited ones
export const getAllPermissionsForRole = (role: keyof typeof RoleTypes): Permission[] => {
  const directPermissions = DefaultPermissions[role];
  const inheritedRoles = getInheritedRoles(role);
  
  // Combine permissions from all inherited roles
  const allPermissions = [...directPermissions];
  inheritedRoles.forEach(inheritedRole => {
    allPermissions.push(...DefaultPermissions[inheritedRole]);
  });
  
  // Remove duplicates and return
  return Array.from(new Set(allPermissions));
};


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

// Get all permissions for a role including inherited ones with proper type safety
export const getRolePermissions = (
  role: Role,
  roleDefs: Record<string, Role>
): Permission[] => {
  // Start with direct permissions
  const permissions = new Set<Permission>(role.permissions);
  
  // If role has inherited roles, process them
  if (role.inheritsFrom && Array.isArray(role.inheritsFrom)) {
    role.inheritsFrom.forEach(inheritedRoleName => {
      // Type guard to ensure inheritedRoleName is a valid role type
      if (inheritedRoleName in RoleTypes) {
        const inheritedRole = roleDefs[inheritedRoleName];
        if (inheritedRole) {
          // Recursively get permissions from inherited role
          const inheritedPermissions = getRolePermissions(inheritedRole, roleDefs);
          // Add each inherited permission to the set
          inheritedPermissions.forEach(permission => {
            if (isValidPermission(permission)) {
              permissions.add(permission);
            }
          });
        }
      }
    });
  }
  
  // Convert Set back to array and validate each permission
  return Array.from(permissions).filter(isValidPermission);
};

// Helper function to calculate role level in hierarchy
export function calculateRoleLevel(
  roleName: keyof typeof RoleTypes,
  visited = new Set<string>()
): number {
  // Prevent infinite recursion
  if (visited.has(roleName)) {
    return 0;
  }
  visited.add(roleName);
  
  const inheritedRoles = RoleHierarchy[roleName] || [];
  if (inheritedRoles.length === 0) {
    return 0;
  }
  
  // Calculate max level of inherited roles
  const maxInheritedLevel = Math.max(
    ...inheritedRoles.map(inherited => {
      if (inherited in RoleTypes) {
        return calculateRoleLevel(inherited as keyof typeof RoleTypes, visited);
      }
      return 0;
    })
  );
  
  return maxInheritedLevel + 1;
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