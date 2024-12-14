import * as admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';

export enum RoleTypes {
  admin = 'admin',
  staff = 'staff',
  manager = 'manager',
  receptionist = 'receptionist'
}

export type Permission = 
  | 'all'
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
  | 'update_appointment_status'
  | 'view_all_appointments';

export const ALL_PERMISSIONS: Permission[] = [
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
];

export const DefaultPermissions: Record<RoleTypes, Permission[]> = {
  [RoleTypes.admin]: ['all'],
  [RoleTypes.staff]: ['view_appointments', 'update_appointment_status'],
  [RoleTypes.manager]: [
    'manage_appointments',
    'view_all_appointments',
    'manage_services',
    'view_services',
    'manage_customers',
    'view_customers',
    'manage_inventory',
    'view_inventory'
  ],
  [RoleTypes.receptionist]: [
    'view_appointments',
    'create_appointments',
    'view_customers',
    'create_customers'
  ]
};

export const InitialRoleConfigs = {
  [RoleTypes.admin]: {
    name: RoleTypes.admin,
    permissions: DefaultPermissions[RoleTypes.admin],
    description: 'Full system access',
    isSystem: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  [RoleTypes.manager]: {
    name: RoleTypes.manager,
    permissions: DefaultPermissions[RoleTypes.manager],
    description: 'Manage daily operations',
    isSystem: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  [RoleTypes.staff]: {
    name: RoleTypes.staff,
    permissions: DefaultPermissions[RoleTypes.staff],
    description: 'Basic staff access',
    isSystem: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  [RoleTypes.receptionist]: {
    name: RoleTypes.receptionist,
    permissions: DefaultPermissions[RoleTypes.receptionist],
    description: 'Handle appointments and customers',
    isSystem: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
};

let firebaseAdmin: admin.app.App | undefined;

export async function initializeFirebaseAdmin(): Promise<admin.app.App> {
  if (firebaseAdmin) {
    console.log('[FIREBASE] Using existing Firebase Admin instance');
    return firebaseAdmin;
  }

  console.log('[FIREBASE] Starting Firebase Admin initialization');

  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      console.error('[FIREBASE] Missing required credentials:', {
        hasProjectId: !!projectId,
        hasClientEmail: !!clientEmail,
        hasPrivateKey: !!privateKey
      });
      throw new Error('[FIREBASE] Missing required Firebase Admin credentials');
    }

    // Format private key
    privateKey = privateKey.replace(/\\n/g, '\n').replace(/^['"]|['"]$/g, '');
    if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
      privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`;
    }

    // Check if Firebase Admin is already initialized
    if (admin.apps.length === 0) {
      console.log('[FIREBASE] Creating new Firebase Admin instance');
      firebaseAdmin = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey
        }),
        databaseURL: `https://${projectId}.firebaseio.com`
      });
    } else {
      console.log('[FIREBASE] Using existing Firebase Admin app');
      firebaseAdmin = admin.apps[0]!;
    }

    // Verify database connection
    const db = admin.database(firebaseAdmin);
    await db.ref('.info/connected').once('value');
    console.log('[FIREBASE] Database connection verified');

    // Initialize default roles if needed
    const rolesSnapshot = await db.ref('role-definitions').once('value');
    if (!rolesSnapshot.exists()) {
      console.log('[FIREBASE] Initializing default role definitions');
      await db.ref('role-definitions').set(InitialRoleConfigs);
      console.log('[FIREBASE] Default roles initialized');
    }

    console.log('[FIREBASE] Firebase Admin SDK initialized successfully');
    return firebaseAdmin;
  } catch (error) {
    console.error('[FIREBASE] Error during Firebase Admin initialization:', error);
    throw error;
  }
}

export async function getFirebaseAdmin(): Promise<admin.app.App> {
  return await initializeFirebaseAdmin();
}

// Helper function to safely get database instance
export async function getFirebaseDatabase() {
  const app = await getFirebaseAdmin();
  return admin.database(app);
}

// Helper function to safely get auth instance
export async function getFirebaseAuth() {
  const app = await getFirebaseAdmin();
  return admin.auth(app);
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

export function validatePermissions(permissions: unknown[]): Permission[] {
  return permissions.filter(isValidPermission);
}

export function isValidPermission(permission: unknown): permission is Permission {
  return typeof permission === 'string' && ALL_PERMISSIONS.includes(permission as Permission);
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
    
    // Get role definition
    const roleDefSnapshot = await db.ref(`role-definitions/${role}`).once('value');
    const roleDef = roleDefSnapshot.val();
    
    if (!roleDef) {
      throw new Error(`Role ${role} not found`);
    }
    
    // Determine final permissions
    const permissions = customPermissions || roleDef.permissions || DefaultPermissions[role];
    
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
  return snapshot.val() || InitialRoleConfigs;
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