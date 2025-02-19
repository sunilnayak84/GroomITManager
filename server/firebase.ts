import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Initialize Firebase Admin
let firebaseApp: admin.app.App | null = null;

export function initializeFirebaseAdmin(): admin.app.App {
  if (!firebaseApp) {
    try {
      console.log('[FIREBASE] Starting Firebase Admin initialization...');
      console.log('[FIREBASE] Admin credential object:', typeof admin.credential, Object.keys(admin.credential));

      // Read service account file
      const serviceAccountPath = join(__dirname, '../serviceAccount.json');
      console.log('[FIREBASE] Reading service account from:', serviceAccountPath);

      let serviceAccountData;
      try {
        const serviceAccountContent = readFileSync(serviceAccountPath, 'utf8');
        serviceAccountData = JSON.parse(serviceAccountContent);
        console.log('[FIREBASE] Service account parsed successfully');
      } catch (error) {
        console.error('[FIREBASE] Error reading service account:', error);
        throw new Error('Failed to read service account file');
      }

      // Validate service account data
      if (!serviceAccountData.project_id || !serviceAccountData.private_key || !serviceAccountData.client_email) {
        throw new Error('Invalid service account data: missing required fields');
      }

      // Format private key correctly
      const privateKey = serviceAccountData.private_key.replace(/\\n/g, '\n');

      const certConfig = {
        projectId: serviceAccountData.project_id,
        privateKey: privateKey,
        clientEmail: serviceAccountData.client_email,
      };
      console.log('[FIREBASE] Cert config prepared:', { 
        projectId: certConfig.projectId,
        clientEmail: certConfig.clientEmail,
        privateKeyLength: certConfig.privateKey.length 
      });

      // Initialize the app with credentials
      const credential = admin.credential.cert(certConfig);
      console.log('[FIREBASE] Credential created successfully');

      firebaseApp = admin.initializeApp({
        credential,
        databaseURL: process.env.FIREBASE_DATABASE_URL || `https://${serviceAccountData.project_id}-default-rtdb.asia-southeast1.firebasedatabase.app`
      });

      console.log('[FIREBASE] Firebase Admin initialized successfully');
      return firebaseApp;
    } catch (error) {
      console.error('[FIREBASE] Error initializing Firebase Admin:', error);

      if (process.env.NODE_ENV === 'development') {
        console.warn('[FIREBASE] Running in development mode, initializing with default app');
        try {
          firebaseApp = admin.initializeApp({
            projectId: 'demo-project',
            credential: admin.credential.applicationDefault()
          });
          return firebaseApp;
        } catch (devError) {
          console.error('[FIREBASE] Failed to initialize development app:', devError);
          throw devError;
        }
      }

      throw error;
    }
  }
  return firebaseApp;
}

export function getFirebaseAdmin(): admin.app.App {
  if (!firebaseApp) {
    return initializeFirebaseAdmin();
  }
  return firebaseApp;
}

// Export the admin instance and services
export { admin };

// Initialize services after Firebase Admin is initialized
const app = getFirebaseAdmin();
export const db = getFirestore(app);
export const auth = getAuth(app);
export const rtdb = getDatabase(app);

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

// Permission validation
export function isValidPermission(permission: unknown): permission is Permission {
  if (typeof permission !== 'string') return false;
  return ALL_PERMISSIONS.includes(permission as Permission);
}

export function validatePermissions(permissions: unknown[]): Permission[] {
  return permissions.filter(isValidPermission);
}

// Role management functions
export async function getUserRole(userId: string): Promise<{ role: RoleTypes; permissions: Permission[] }> {
  try {
    const roleDoc = await db.collection('roles').doc(userId).get();
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
  await auth.getUser(userId);
  const timestamp = new Date();
  const permissions = customPermissions || DefaultPermissions[role];

  await db.collection('roles').doc(userId).set({
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
  const snapshot = await rtdb.ref('role-definitions').once('value');
  if (!snapshot.exists()) {
    await rtdb.ref('role-definitions').set(InitialRoleConfigs);
  }

  // Set up admin role
  await rtdb.ref(`roles/${userId}`).set({
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
  const snapshot = await rtdb.ref('role-definitions').once('value');
  return snapshot.val() || InitialRoleConfigs;
}

export async function updateRoleDefinition(
  roleName: string,
  permissions: Permission[],
  description?: string
) {
  const roleRef = rtdb.ref(`role-definitions/${roleName}`);
  const snapshot = await roleRef.once('value');

  if (!snapshot.exists()) {
    throw new Error(`Role ${roleName} not found`);
  }

  const currentRole = snapshot.val();

  if (currentRole.isSystem) {
    throw new Error('Cannot modify system roles');
  }

  const timestamp = Date.now();
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