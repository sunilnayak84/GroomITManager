import * as admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';

// Role Types
export enum RoleTypes {
  admin = 'admin',
  manager = 'manager',
  staff = 'staff',
  receptionist = 'receptionist'
}

// All available permissions as a const array
export const ALL_PERMISSIONS = [
  'all',
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
  'view_financial_reports'
] as const;

// Permission type derived from the const array
export type Permission = typeof ALL_PERMISSIONS[number];

// Default permissions for each role
export const DefaultPermissions: Record<RoleTypes, Permission[]> = {
  [RoleTypes.admin]: ['all'],
  [RoleTypes.manager]: [
    'manage_appointments',
    'view_appointments',
    'manage_services',
    'view_services',
    'manage_customers',
    'view_customers',
    'manage_inventory',
    'view_inventory'
  ],
  [RoleTypes.staff]: [
    'view_appointments',
    'manage_own_schedule',
    'view_customers'
  ],
  [RoleTypes.receptionist]: [
    'view_appointments',
    'create_appointments',
    'view_customers',
    'create_customers'
  ]
};

// Role configuration interface
export interface RoleConfig {
  permissions: Permission[];
  description: string;
  isSystem: boolean;
  createdAt: number;
  updatedAt: number;
}

// Initial role configurations
export const InitialRoleConfigs: Record<RoleTypes, RoleConfig> = {
  [RoleTypes.admin]: {
    permissions: ['all'],
    description: 'Full system access with all permissions',
    isSystem: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  [RoleTypes.manager]: {
    permissions: DefaultPermissions[RoleTypes.manager],
    description: 'Manages daily operations and staff',
    isSystem: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  [RoleTypes.staff]: {
    permissions: DefaultPermissions[RoleTypes.staff],
    description: 'Regular staff member access',
    isSystem: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  [RoleTypes.receptionist]: {
    permissions: DefaultPermissions[RoleTypes.receptionist],
    description: 'Front desk and customer service access',
    isSystem: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
};


let firebaseApp: admin.app.App | null = null;

export async function initializeFirebaseAdmin(): Promise<admin.app.App> {
  if (firebaseApp) {
    return firebaseApp;
  }

  try {
    console.log('[FIREBASE] Starting Firebase Admin initialization...');
    
    // Get environment variables with validation
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    // Enhanced validation with detailed error messages
    if (!projectId) throw new Error('FIREBASE_PROJECT_ID is missing');
    if (!clientEmail) throw new Error('FIREBASE_CLIENT_EMAIL is missing');
    if (!privateKey) throw new Error('FIREBASE_PRIVATE_KEY is missing');

    // Format private key properly
    privateKey = privateKey.replace(/\\n/g, '\n');
    
    // Add BEGIN/END markers if they're missing
    if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
      privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`;
    }

    console.log('[FIREBASE] Credentials validation passed');
    console.log('[FIREBASE] Attempting to initialize with project:', projectId);

    // Create credential cert with formatted key
    const credential = admin.credential.cert({
      projectId: projectId,
      clientEmail: clientEmail,
      privateKey: privateKey
    });

    // Initialize app with credential
    const app = admin.initializeApp({
      credential: credential,
      databaseURL: `https://${projectId}-default-rtdb.asia-southeast1.firebasedatabase.app`
    });

    console.log('[FIREBASE] Firebase Admin initialized successfully');
    firebaseApp = app;
    return app;
  } catch (error) {
    console.error('[FIREBASE] Failed to initialize Firebase Admin:', error);
    if (error instanceof Error) {
      console.error('[FIREBASE] Error details:', error.message);
      console.error('[FIREBASE] Error stack:', error.stack);
      
      // Additional debugging for credential issues
      if (error.message.includes('cert')) {
        console.error('[FIREBASE] Credential creation failed. Please check the format of your credentials.');
      }
    }
    throw error;
  }
}

// Helper functions
export async function getFirebaseAdmin(): Promise<admin.app.App> {
  const app = await initializeFirebaseAdmin();
  return app;
}

export async function getFirebaseAuth() {
  const app = await getFirebaseAdmin();
  return getAuth(app);
}

export async function getFirebaseDatabase() {
  const app = await getFirebaseAdmin();
  return getDatabase(app);
}

// Permission validation
export function isValidPermission(permission: unknown): permission is Permission {
  if (typeof permission !== 'string') return false;
  return (ALL_PERMISSIONS as string[]).includes(permission);
}

export function validatePermissions(permissions: unknown[]): Permission[] {
  return permissions.filter(isValidPermission);
}

export async function getUserRole(userId: string): Promise<{ role: RoleTypes; permissions: Permission[] }> {
  const db = await getFirebaseDatabase();
  const snapshot = await db.ref(`roles/${userId}`).once('value');
  const roleData = snapshot.val();
  
  if (!roleData) {
    return {
      role: RoleTypes.staff,
      permissions: DefaultPermissions[RoleTypes.staff]
    };
  }
  
  return {
    role: roleData.role as RoleTypes,
    permissions: roleData.permissions as Permission[]
  };
}

export async function updateUserRole(
  userId: string,
  role: RoleTypes,
  customPermissions?: Permission[]
): Promise<{ success: boolean; role: RoleTypes; permissions: Permission[] }> {
  const db = await getFirebaseDatabase();
  const auth = await getFirebaseAuth();
  const timestamp = Date.now();
  
  try {
    // Get user record to verify existence
    const userRecord = await auth.getUser(userId);
    
    // Determine final permissions
    const permissions = customPermissions || DefaultPermissions[role];
    
    // Update role in Firebase Realtime Database
    await db.ref(`roles/${userId}`).set({
      role,
      permissions,
      updatedAt: timestamp
    });
    
    // Log the role change
    await db.ref(`role-history/${userId}`).push({
      role,
      permissions,
      timestamp,
      type: 'role_update'
    });
    
    // Set custom claims
    await auth.setCustomUserClaims(userId, {
      role,
      permissions,
      updatedAt: timestamp
    });
    
    return {
      success: true,
      role,
      permissions
    };
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
}

export async function listAllUsers(pageToken?: string) {
  const auth = await getFirebaseAuth();
  const result = await auth.listUsers(100, pageToken);
  
  const users = await Promise.all(
    result.users.map(async (userRecord) => {
      const roleData = await getUserRole(userRecord.uid);
      return {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        role: roleData.role,
        permissions: roleData.permissions
      };
    })
  );
  
  return {
    users,
    pageToken: result.pageToken
  };
}

export async function getRoleDefinitions() {
  const db = await getFirebaseDatabase();
  const snapshot = await db.ref('role-definitions').once('value');
  return snapshot.val() || {}; // Return empty object if no roles defined.
}

export async function updateRoleDefinition(
  roleName: string,
  permissions: Permission[],
  description?: string
) {
  const db = await getFirebaseDatabase();
  const timestamp = Date.now();
  
  const roleRef = db.ref(`role-definitions/${roleName}`);
  const snapshot = await roleRef.once('value');
  
  if (!snapshot.exists()) {
    throw new Error(`Role ${roleName} not found`);
  }
  
  const currentRole = snapshot.val();
  
  if (currentRole.isSystem) {
    throw new Error('Cannot modify system roles');
  }
  
  const updatedRole = {
    ...currentRole,
    permissions,
    description: description || currentRole.description,
    updatedAt: timestamp
  };
  
  await roleRef.update(updatedRole);
  
  // Log the update
  await db.ref(`role-definitions/${roleName}/history`).push({
    permissions,
    timestamp,
    type: 'definition_update'
  });
  
  return updatedRole;
}