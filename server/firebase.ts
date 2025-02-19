import * as admin from 'firebase-admin';

// Initialize Firebase Admin
let firebaseApp: admin.app.App | null = null;

export async function getFirebaseAdmin(): Promise<admin.app.App> {
  if (!firebaseApp) {
    try {
      const { default: serviceAccount } = await import('../serviceAccount.json', {
        assert: { type: 'json' }
      });
      
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://replit-5ac6a-default-rtdb.asia-southeast1.firebasedatabase.app'
      });
      console.log('Firebase Admin initialized successfully');
    } catch (error) {
      console.error('Error initializing Firebase Admin:', error);
      throw error;
    }
  }
  return firebaseApp;
}

// Export the admin instance
export { admin };

// Role Types
export enum RoleTypes {
  admin = 'admin',
  manager = 'manager',
  staff = 'staff',
  receptionist = 'receptionist'
}

// All available permissions
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

export const InitialRoleConfigs = {
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

export const db = getFirebaseAdmin().firestore();
export const auth = getFirebaseAdmin().auth();

// Permission validation
export function isValidPermission(permission: unknown): permission is Permission {
  if (typeof permission !== 'string') return false;
  return ALL_PERMISSIONS.includes(permission as Permission);
}

export function validatePermissions(permissions: unknown[]): Permission[] {
  return permissions.filter(isValidPermission);
}

// Initialize Firebase Admin
export async function initializeFirebaseAdmin(): Promise<admin.app.App> {
  return getFirebaseAdmin();
}

// Role management functions
export async function getUserRole(userId: string): Promise<{ role: RoleTypes; permissions: Permission[] }> {
  const firestore = getFirebaseAdmin().firestore();
  try {
    const roleDoc = await firestore.collection('roles').doc(userId).get();
    const roleData = roleDoc.data();

    if (!roleData) {
      console.log(`[ROLES] No role found for user ${userId}, defaulting to staff`);
      return {
        role: RoleTypes.staff,
        permissions: DefaultPermissions[RoleTypes.staff]
      };
    }

    console.log(`[ROLES] Found role for user ${userId}:`, roleData);
    return {
      role: roleData.role as RoleTypes,
      permissions: roleData.permissions as Permission[]
    };
  } catch (error) {
    console.error(`[ROLES] Error getting role for user ${userId}:`, error);
    return {
      role: RoleTypes.staff,
      permissions: DefaultPermissions[RoleTypes.staff]
    };
  }
}

export async function updateUserRole(
  userId: string,
  role: RoleTypes,
  customPermissions?: Permission[]
): Promise<{ success: boolean; role: RoleTypes; permissions: Permission[] }> {
  const app = getFirebaseAdmin();
  const firestore = app.firestore();
  const auth = app.auth();
  const timestamp = new Date();

  await auth.getUser(userId);

  const permissions = customPermissions || DefaultPermissions[role];

  await firestore.collection('roles').doc(userId).set({
    role,
    permissions,
    updatedAt: timestamp
  });

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
}

export async function setupAdminUser(adminEmail: string): Promise<void> {
  const app = getFirebaseAdmin();
  const auth = app.auth();
  const db = app.database();

  let userRecord;
  try {
    userRecord = await auth.getUserByEmail(adminEmail);
  } catch (error) {
    userRecord = await auth.createUser({
      email: adminEmail,
      emailVerified: true,
      displayName: 'System Admin',
    });
  }

  const userId = userRecord.uid;

  // Initialize role definitions if they don't exist
  const roleDefsRef = db.ref('role-definitions');
  const roleDefsSnapshot = await roleDefsRef.once('value');
  if (!roleDefsSnapshot.exists()) {
    await roleDefsRef.set(InitialRoleConfigs);
  }

  // Set up admin role
  await db.ref(`roles/${userId}`).set({
    role: RoleTypes.admin,
    permissions: DefaultPermissions[RoleTypes.admin],
    updatedAt: Date.now(),
    createdAt: Date.now()
  });

  await auth.setCustomUserClaims(userId, {
    role: RoleTypes.admin,
    permissions: DefaultPermissions[RoleTypes.admin],
    updatedAt: Date.now()
  });
}

export async function listAllUsers(pageToken?: string) {
  const auth = getFirebaseAdmin().auth();
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

// Role definitions management
export async function getRoleDefinitions() {
  const db = getFirebaseAdmin().database();
  const snapshot = await db.ref('role-definitions').once('value');
  return snapshot.val() || InitialRoleConfigs;
}

export async function updateRoleDefinition(
  roleName: string,
  permissions: Permission[],
  description?: string
) {
  const db = getFirebaseAdmin().database();
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

  await roleRef.child('history').push({
    permissions,
    timestamp,
    type: 'definition_update'
  });

  return updatedRole;
}