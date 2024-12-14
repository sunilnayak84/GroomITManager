
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
  | 'view_financial_reports';

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

let firebaseAdmin: admin.app.App | null = null;

export function initializeFirebaseAdmin() {
  if (!firebaseAdmin) {
    const isDevelopment = process.env.NODE_ENV === 'development';
    console.log(`[FIREBASE] Initializing Firebase Admin in ${isDevelopment ? 'development' : 'production'} mode`);

    try {
      // Development mode configuration
      if (isDevelopment) {
        console.log('[FIREBASE] Using development configuration');
        
        // Use development service account
        const devServiceAccount = {
          projectId: 'groomery-dev',
          clientEmail: 'firebase-adminsdk-dev@groomery-dev.iam.gserviceaccount.com',
          privateKey: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC9QFRnhqDKB80J\n-----END PRIVATE KEY-----\n'
        };
        
        firebaseAdmin = admin.initializeApp({
          credential: admin.credential.cert(devServiceAccount as admin.ServiceAccount),
          databaseURL: 'https://groomery-dev.firebaseio.com'
        }, 'admin-app-dev');

        console.log('[FIREBASE] Development mode Firebase Admin initialized');
      } else {
        // Production mode - require proper credentials
        const projectId = process.env.FIREBASE_PROJECT_ID;
        const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

        if (!projectId || !privateKey || !clientEmail) {
          throw new Error('Missing Firebase Admin credentials');
        }

        firebaseAdmin = admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            privateKey,
            clientEmail,
          } as admin.ServiceAccount),
          databaseURL: `https://${projectId}.firebaseio.com`
        });
      }

      console.log('[FIREBASE] Firebase Admin initialized successfully');
    } catch (error) {
      console.error('[FIREBASE] Failed to initialize Firebase Admin:', error);
      if (isDevelopment) {
        console.warn('[FIREBASE] Continuing in development mode despite initialization error');
        return null;
      }
      throw error;
    }
  }
  return firebaseAdmin;
}

export function getFirebaseAdmin() {
  if (!firebaseAdmin) {
    initializeFirebaseAdmin();
  }
  return firebaseAdmin;
}

export async function getUserRole(userId: string): Promise<{ role: RoleTypes; permissions: Permission[] }> {
  const db = getDatabase();
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
  const db = getDatabase();
  const auth = getAuth();
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
  const auth = getAuth();
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
  const db = getDatabase();
  const snapshot = await db.ref('role-definitions').once('value');
  return snapshot.val() || InitialRoleConfigs;
}

export async function updateRoleDefinition(
  roleName: string,
  permissions: Permission[],
  description?: string
) {
  const db = getDatabase();
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
