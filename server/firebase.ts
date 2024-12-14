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
    console.log('[FIREBASE] Using existing Firebase Admin instance');
    return firebaseApp;
  }

  try {
    console.log('[FIREBASE] Starting Firebase Admin initialization');
    
    // Step 1: Validate environment variables
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    console.log('[FIREBASE] Checking credentials:', {
      hasProjectId: !!projectId,
      hasClientEmail: !!clientEmail,
      hasPrivateKey: !!privateKey,
      projectId: projectId
    });

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error('Missing required Firebase Admin credentials');
    }

    // Step 2: Format private key
    console.log('[FIREBASE] Formatting private key...');
    try {
      // Remove surrounding quotes and whitespace
      privateKey = privateKey.trim().replace(/^["']|["']$/g, '');
      
      // Replace literal \n with actual newlines
      privateKey = privateKey.replace(/\\n/g, '\n');
      
      // Ensure proper PEM format
      if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
        privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`;
      }
      
      console.log('[FIREBASE] Private key formatted successfully');
    } catch (error) {
      console.error('[FIREBASE] Private key formatting error:', error);
      throw new Error('Failed to format Firebase private key');
    }

    // Step 3: Create service account credential
    console.log('[FIREBASE] Creating service account credential...');
    const serviceAccount = {
      projectId,
      clientEmail,
      privateKey
    };
    
    // Step 4: Initialize credential
    console.log('[FIREBASE] Initializing credential...');
    if (!admin.credential) {
      throw new Error('Firebase Admin credential is undefined');
    }
    
    try {
      const credential = admin.credential.cert({
        projectId: serviceAccount.projectId,
        clientEmail: serviceAccount.clientEmail,
        privateKey: serviceAccount.privateKey
      });
      
      if (!credential) {
        throw new Error('Failed to create Firebase credential');
      }
      
      console.log('[FIREBASE] Credential created successfully');

    // Step 5: Initialize Firebase app
      console.log('[FIREBASE] Initializing Firebase app...');
      const app = admin.initializeApp({
        credential,
        databaseURL: `https://${projectId}-default-rtdb.asia-southeast1.firebasedatabase.app`
      });
    } catch (error) {
      console.error('[FIREBASE] Error creating credential:', error);
      if (error instanceof Error) {
        console.error('[FIREBASE] Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
      throw new Error('Failed to create Firebase credential');
    }

    // Step 6: Verify database connection
    console.log('[FIREBASE] Verifying database connection...');
    const db = getDatabase(app);
    await db.ref('.info/connected').once('value');
    console.log('[FIREBASE] Database connection verified successfully');

    firebaseApp = app;
    console.log('[FIREBASE] Firebase Admin SDK initialized successfully');
    
    return app;
  } catch (error) {
    console.error('[FIREBASE] Initialization error:', error);
    if (error instanceof Error) {
      console.error('[FIREBASE] Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    throw error; // Re-throw the error to be handled by the caller
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