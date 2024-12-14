import * as admin from 'firebase-admin';
import { getDatabase } from 'firebase-admin/database';
import { getAuth } from 'firebase-admin/auth';

// Role types and permissions
export const RoleTypes = {
  admin: 'admin',
  manager: 'manager',
  staff: 'staff',
  receptionist: 'receptionist'
} as const;

export type RoleType = keyof typeof RoleTypes;

// Define permissions as a union type for type safety
export type Permission =
  | 'manage_appointments'
  | 'view_appointments'
  | 'create_appointments'
  | 'cancel_appointments'
  | 'manage_customers'
  | 'view_customers'
  | 'create_customers'
  | 'edit_customer_info'
  | 'manage_services'
  | 'view_services'
  | 'create_services'
  | 'edit_services'
  | 'manage_inventory'
  | 'view_inventory'
  | 'update_stock'
  | 'manage_consumables'
  | 'manage_staff_schedule'
  | 'view_staff_schedule'
  | 'manage_own_schedule'
  | 'view_analytics'
  | 'view_reports'
  | 'view_financial_reports'
  | 'all';

// Role interface
export interface Role {
  name: string;
  permissions: Permission[];
  description: string;
  isSystem: boolean;
  createdAt: number;
  updatedAt: number;
}

// Default permissions for system roles
export const DefaultPermissions: Record<RoleType, Permission[]> = {
  admin: ['all'],
  manager: [
    'manage_appointments',
    'view_appointments',
    'create_appointments',
    'manage_customers',
    'view_customers',
    'manage_services',
    'view_services',
    'manage_inventory',
    'view_inventory',
    'view_analytics',
    'view_reports'
  ],
  staff: [
    'view_appointments',
    'view_customers',
    'view_services',
    'manage_own_schedule'
  ],
  receptionist: [
    'view_appointments',
    'create_appointments',
    'view_customers',
    'create_customers',
    'view_services'
  ]
};

// Initial role configurations
export const InitialRoleConfigs: Record<string, Role> = {
  admin: {
    name: 'admin',
    permissions: DefaultPermissions.admin,
    description: 'Full system access',
    isSystem: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  manager: {
    name: 'manager',
    permissions: DefaultPermissions.manager,
    description: 'Branch management access',
    isSystem: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  staff: {
    name: 'staff',
    permissions: DefaultPermissions.staff,
    description: 'Basic staff access',
    isSystem: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  receptionist: {
    name: 'receptionist',
    permissions: DefaultPermissions.receptionist,
    description: 'Front desk operations',
    isSystem: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
};

// Initialize Firebase Admin
export async function initializeFirebaseAdmin() {
  try {
    // Check if already initialized
    if (admin.apps && admin.apps.length > 0 && admin.apps[0]) {
      console.log('[FIREBASE] Already initialized');
      return admin.apps[0];
    }

    console.log('[FIREBASE] Starting initialization...');

    // Get environment variables
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    // Enhanced environment variable validation
    const missingVars = [];
    if (!projectId) missingVars.push('FIREBASE_PROJECT_ID');
    if (!clientEmail) missingVars.push('FIREBASE_CLIENT_EMAIL');
    if (!privateKey) missingVars.push('FIREBASE_PRIVATE_KEY');

    if (missingVars.length > 0) {
      throw new Error(`Missing required Firebase configuration: ${missingVars.join(', ')}`);
    }

    // Format private key
    privateKey = privateKey.replace(/\\n/g, '\n');
    privateKey = privateKey.replace(/^["']|["']$/g, '');
    
    if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
      privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----\n`;
    }

    // Initialize with typed configuration
    const adminConfig: admin.ServiceAccount = {
      projectId,
      clientEmail,
      privateKey
    };

    // Initialize Firebase Admin with proper error handling
    const app = admin.initializeApp({
      credential: admin.credential.cert(adminConfig),
      databaseURL: `https://${projectId}-default-rtdb.firebaseio.com`
    });

    console.log('[FIREBASE] Successfully initialized with project:', projectId);
    
    // Verify initialization
    if (!app) {
      throw new Error('Firebase Admin initialization failed - app instance is null');
    }

    return app;
  } catch (error) {
    console.error('[FIREBASE] Initialization failed:', error);
    if (error instanceof Error) {
      throw error; // Preserve the original error stack
    }
    throw new Error('Failed to initialize Firebase Admin: Unknown error');
  }
}

// Utility function to validate permissions
export function validatePermissions(permissions: unknown[]): Permission[] {
  return permissions.filter(isValidPermission);
}

// Type guard for permissions
export function isValidPermission(permission: unknown): permission is Permission {
  return typeof permission === 'string' && 
    (Object.values(DefaultPermissions).flat().includes(permission as Permission) || 
     permission === 'all');
}

export const ALL_PERMISSIONS = Array.from(
  new Set(Object.values(DefaultPermissions).flat())
);

// Get Firebase Admin instance
export async function getFirebaseAdmin() {
  return await initializeFirebaseAdmin();
}

export async function getFirebaseAuth() {
  const app = await getFirebaseAdmin();
  return getAuth(app);
}

export async function getFirebaseDatabase() {
  const app = await getFirebaseAdmin();
  return getDatabase(app);
}

// System roles array for validation
export const SYSTEM_ROLES = Object.keys(RoleTypes);


// Define role types (lowercase to match database)

let firebaseApp: admin.app.App | null = null;

// Initialize Firebase Admin

// Get Firebase Admin instance

// Initialize roles in Firebase

// Setup development admin

// This section was removed to fix duplicate declaration

// Update user role
export async function updateUserRole(uid: string, role: string) {
  console.log(`[ROLE-UPDATE] Starting role update for user ${uid} to ${role}`);
  
  const app = await getFirebaseAdmin();
  if (!app) {
    throw new Error('Firebase Admin not initialized');
  }

  try {
    const db = getDatabase(app);
    const auth = app.auth();
    const timestamp = Date.now();

    // Get user details
    const userRecord = await auth.getUser(uid);
    const email = userRecord.email || '';

    // Get role definition
    const roleSnapshot = await db.ref(`role-definitions/${role}`).once('value');
    const roleDefinition = roleSnapshot.val();

    if (!roleDefinition) {
      throw new Error(`Role ${role} not found`);
    }

    // Prevent non-admins from being assigned admin role
    if (role === RoleTypes.admin && !email.endsWith('@groomery.in')) {
      throw new Error('Admin role can only be assigned to company email addresses');
    }

    // Get current role for history
    const currentRoleSnapshot = await db.ref(`roles/${uid}`).once('value');
    const currentRole = currentRoleSnapshot.val();

    const roleData = {
      uid,
      email,
      role,
      permissions: roleDefinition.permissions,
      updatedAt: timestamp,
      displayName: userRecord.displayName || email.split('@')[0],
      ...(role === RoleTypes.admin && { isAdmin: true })
    };

    // Create history entry
    const historyEntry = {
      uid,
      email,
      previousRole: currentRole?.role || 'none',
      newRole: role,
      previousPermissions: currentRole?.permissions || [],
      newPermissions: roleDefinition.permissions,
      timestamp,
      type: 'role_update'
    };

    // Prepare atomic updates
    const updates: Record<string, any> = {
      [`roles/${uid}`]: roleData,
      [`role-history/${uid}/${timestamp}`]: historyEntry
    };

    // Apply updates atomically
    await db.ref().update(updates);

    // Update Firebase Auth custom claims
    await auth.setCustomUserClaims(uid, {
      role,
      permissions: roleDefinition.permissions,
      updatedAt: timestamp
    });

    // Force token refresh
    await auth.revokeRefreshTokens(uid);

    console.log(`[ROLE-UPDATE] Successfully updated role for user ${email} to ${role}`);

    return {
      uid,
      email,
      role,
      permissions: roleDefinition.permissions,
      timestamp,
      success: true
    };
  } catch (error) {
    console.error('[ROLE-UPDATE] Error:', error);
    throw error instanceof Error 
      ? error 
      : new Error('Failed to update user role');
  }
}

// Function to assign role to a user and log the change
export async function assignUserRole(
  uid: string,
  role: string,
  assignedBy: string
): Promise<void> {
  console.log(`[ROLE-ASSIGN] Assigning role ${role} to user ${uid}`);
  
  const app = await getFirebaseAdmin();
  if (!app) {
    throw new Error('Firebase Admin not initialized');
  }
  
  const db = getDatabase(app);
  const timestamp = Date.now();
  
  try {
    // Get user details from Firebase Auth
    const userRecord = await app.auth().getUser(uid);
    if (!userRecord) {
      throw new Error('User not found');
    }
    
    // Get role definition
    const roleSnapshot = await db.ref(`role-definitions/${role}`).once('value');
    const roleDefinition = roleSnapshot.val();
    
    if (!roleDefinition) {
      throw new Error(`Role ${role} not found`);
    }
    
    // Prepare role assignment data
    const roleData = {
      uid,
      email: userRecord.email,
      role,
      permissions: roleDefinition.permissions,
      updatedAt: timestamp,
      updatedBy: assignedBy
    };
    
    // Create atomic updates
    const updates: Record<string, any> = {
      [`roles/${uid}`]: roleData,
      [`role-history/${uid}/${timestamp}`]: {
        ...roleData,
        action: 'role_assigned',
        assignedBy
      }
    };
    
    // Apply updates atomically
    await db.ref().update(updates);
    
    // Update Firebase Auth custom claims
    await app.auth().setCustomUserClaims(uid, {
      role,
      permissions: roleDefinition.permissions,
      updatedAt: timestamp
    });
    
    console.log(`[ROLE-ASSIGN] Successfully assigned role ${role} to user ${uid}`);
  } catch (error) {
    console.error('[ROLE-ASSIGN] Error:', error);
    throw error instanceof Error 
      ? error 
      : new Error('Failed to assign user role');
  }
}

// Function to get user's current role
export async function getUserRole(uid: string): Promise<{ role: RoleType; permissions: Permission[] } | null> {
  console.log(`[ROLE-GET] Getting role for user ${uid}`);
  
  const app = await getFirebaseAdmin();
  if (!app) {
    throw new Error('Firebase Admin not initialized');
  }
  
  try {
    const db = getDatabase(app);
    const snapshot = await db.ref(`roles/${uid}`).once('value');
    
    if (!snapshot.exists()) {
      // Set default role to staff if no role is found
      const defaultRole = {
        role: RoleTypes.staff as RoleType,
        permissions: DefaultPermissions.staff
      };
      
      // Save default role
      await db.ref(`roles/${uid}`).set({
        ...defaultRole,
        updatedAt: Date.now(),
        createdAt: Date.now()
      });
      
      return defaultRole;
    }
    
    const roleData = snapshot.val();
    return {
      role: roleData.role as RoleType,
      permissions: validatePermissions(roleData.permissions)
    };
  } catch (error) {
    console.error('[ROLE-GET] Error:', error);
    throw error instanceof Error 
      ? error 
      : new Error('Failed to get user role');
  }
}

// Function to initialize admin user if not exists
export async function initializeAdminUser(adminEmail: string, adminUid: string): Promise<void> {
  console.log(`[ADMIN-INIT] Initializing admin user ${adminEmail}`);
  
  const app = await getFirebaseAdmin();
  if (!app) {
    throw new Error('Firebase Admin not initialized');
  }
  
  const db = getDatabase(app);
  
  try {
    // Check if admin role exists
    const roleSnapshot = await db.ref('role-definitions/admin').once('value');
    if (!roleSnapshot.exists()) {
      throw new Error('Admin role not found in role definitions');
    }
    
    // Check if user already has admin role
    const userRoleSnapshot = await db.ref(`roles/${adminUid}`).once('value');
    if (!userRoleSnapshot.exists()) {
      // Assign admin role
      await assignUserRole(adminUid, 'admin', 'system');
      console.log(`[ADMIN-INIT] Successfully initialized admin user ${adminEmail}`);
    } else {
      console.log(`[ADMIN-INIT] Admin user ${adminEmail} already initialized`);
    }
  } catch (error) {
    console.error('[ADMIN-INIT] Error:', error);
    throw error instanceof Error 
      ? error 
      : new Error('Failed to initialize admin user');
  }
}
// Create custom role
export async function createCustomRole(
  name: string,
  permissions: Permission[],
  description: string,
  createdBy: string
) {
  console.log('[ROLE-CREATE] Starting custom role creation:', { name, permissions });
  
  const app = await getFirebaseAdmin();
  if (!app) {
    throw new Error('Firebase Admin not initialized');
  }

  try {
    const db = getDatabase(app);
    const timestamp = Date.now();

    // Validate role name format
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      throw new Error('Role name can only contain letters, numbers, underscores, and hyphens');
    }

    // Check if role already exists
    const roleRef = db.ref(`role-definitions/${name}`);
    const snapshot = await roleRef.once('value');
    
    if (snapshot.exists()) {
      throw new Error(`Role ${name} already exists`);
    }

    // Prevent creating system roles
    if (name in RoleTypes) {
      throw new Error('Cannot create system roles');
    }

    // Validate permissions
    const validatedPermissions = validatePermissions(permissions);
    if (validatedPermissions.length !== permissions.length) {
      const invalidPerms = permissions.filter(p => !isValidPermission(p));
      throw new Error(`Invalid permissions: ${invalidPerms.join(', ')}`);
    }

    const roleData: Role = {
      name,
      permissions: validatedPermissions,
      description,
      isSystem: false,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    // Create atomic updates
    const updates = {
      [`role-definitions/${name}`]: roleData,
      [`role-history/${name}/${timestamp}`]: {
        action: 'created',
        roleType: 'custom',
        permissions: validatedPermissions,
        description,
        timestamp,
        createdBy
      }
    };

    // Apply updates atomically
    await db.ref().update(updates);

    console.log(`[ROLE-CREATE] Successfully created custom role: ${name}`);
    return roleData;
  } catch (error) {
    console.error('[ROLE-CREATE] Error:', error);
    throw error instanceof Error 
      ? error 
      : new Error('Failed to create custom role');
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
    const snapshot = await rolesRef.once('value');
    const roles = snapshot.val();
    
    if (!roles) {
      console.log('[ROLES] No roles found in database, initializing with system roles');
      await rolesRef.set(InitialRoleConfigs);
      return InitialRoleConfigs;
    }
    
    // Transform roles to ensure consistent format and type safety
    const transformedRoles = Object.entries(roles).reduce<Record<string, Role>>((acc, [name, role]: [string, any]) => {
      const validPermissions = validatePermissions(Array.isArray(role.permissions) ? role.permissions : []);
      
      // For system roles, ensure they have their required permissions
      let finalPermissions = validPermissions;
      if (role.isSystem && name in DefaultPermissions) {
        const defaultPerms = DefaultPermissions[name as keyof typeof RoleTypes];
        finalPermissions = Array.from(new Set([...defaultPerms, ...validPermissions]));
      }
      
      acc[name] = {
        name,
        permissions: finalPermissions,
        description: role.description || '',
        isSystem: role.isSystem || Object.keys(RoleTypes).includes(name),
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