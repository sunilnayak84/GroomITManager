import admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';

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

export type Role = string;

// Default permissions for each role.  These will likely need to be updated to reflect your database structure.
export const DefaultPermissions: Record<Role, Permission[]> = {
  'admin': ['all'],
  'manager': [
    'manage_appointments',
    'view_appointments',
    'manage_services',
    'view_services',
    'manage_customers',
    'view_customers',
    'manage_inventory',
    'view_inventory'
  ],
  'staff': [
    'view_appointments',
    'manage_own_schedule',
    'view_customers'
  ],
  'receptionist': [
    'view_appointments',
    'create_appointments',
    'view_customers',
    'create_customers'
  ]
};

export const InitialRoleConfigs = {
  'admin': {
    permissions: ['all'],
    description: 'Full system access with all permissions',
    isSystem: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  'manager': {
    permissions: DefaultPermissions['manager'],
    description: 'Manages daily operations and staff',
    isSystem: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  'staff': {
    permissions: DefaultPermissions['staff'],
    description: 'Regular staff member access',
    isSystem: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  'receptionist': {
    permissions: DefaultPermissions['receptionist'],
    description: 'Front desk and customer service access',
    isSystem: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
};

let firebaseApp: admin.app.App | null = null;

export function getFirebaseAdmin(): admin.app.App {
  if (firebaseApp) {
    return firebaseApp;
  }

  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  
  if (!privateKey || !process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL) {
    throw new Error('Missing Firebase credentials');
  }

  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey
    }),
    databaseURL: 'https://replit-5ac6a-default-rtdb.asia-southeast1.firebasedatabase.app'
  });

  return firebaseApp;
}

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
  if (firebaseApp) {
    return firebaseApp;
  }

  return getFirebaseAdmin();
}

// Role management functions
export async function getUserRole(userId: string): Promise<{ role: Role; permissions: Permission[] }> {
  const db = getDatabase(getFirebaseAdmin());
  const snapshot = await db.ref(`roles/${userId}`).once('value');
  const roleData = snapshot.val();
  
  if (!roleData) {
    return {
      role: 'staff', // Default to 'staff' if no role is found
      permissions: DefaultPermissions['staff']
    };
  }
  
  return {
    role: roleData.role,
    permissions: roleData.permissions as Permission[]
  };
}

export async function updateUserRole(
  userId: string,
  role: Role,
  customPermissions?: Permission[]
): Promise<{ success: boolean; role: Role; permissions: Permission[] }> {
  const app = getFirebaseAdmin();
  const db = getDatabase(app);
  const auth = getAuth(app);
  const timestamp = Date.now();
  
  await auth.getUser(userId);
  
  const permissions = customPermissions || DefaultPermissions[role] || []; // Handle cases where DefaultPermissions[role] is undefined.
  
  await db.ref(`roles/${userId}`).set({
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
  const auth = getAuth(app);
  const db = getDatabase(app);
  
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
    role: 'admin',
    permissions: DefaultPermissions['admin'],
    updatedAt: Date.now(),
    createdAt: Date.now()
  });
  
  await auth.setCustomUserClaims(userId, {
    role: 'admin',
    permissions: DefaultPermissions['admin'],
    updatedAt: Date.now()
  });
}

export async function listAllUsers(pageToken?: string) {
  const auth = getAuth(getFirebaseAdmin());
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
  const db = getDatabase(getFirebaseAdmin());
  const snapshot = await db.ref('role-definitions').once('value');
  return snapshot.val() || InitialRoleConfigs;
}

export async function updateRoleDefinition(
  roleName: string,
  permissions: Permission[],
  description?: string
) {
  const db = getDatabase(getFirebaseAdmin());
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