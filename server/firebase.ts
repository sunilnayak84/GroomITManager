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

let firebaseApp: admin.app.App | null = null;

export function getFirebaseAdmin(): admin.app.App {
  if (!firebaseApp) {
    throw new Error('Firebase Admin not initialized. Call initializeFirebaseAdmin first.');
  }
  return firebaseApp;
}

function formatPrivateKey(key: string): string {
  // Remove any wrapping quotes
  let formattedKey = key.replace(/['"]/g, '');
  
  // Replace literal \n with actual newlines if they exist
  formattedKey = formattedKey.replace(/\\n/g, '\n');
  
  // Ensure proper PEM format
  if (!formattedKey.includes('-----BEGIN PRIVATE KEY-----')) {
    formattedKey = `-----BEGIN PRIVATE KEY-----\n${formattedKey}\n-----END PRIVATE KEY-----`;
  }
  
  return formattedKey;
}

export async function initializeFirebaseAdmin(): Promise<admin.app.App> {
  console.log('[FIREBASE] Starting Firebase Admin initialization...');
  
  try {
    // Return existing instance if available
    if (firebaseApp) {
      console.log('[FIREBASE] Using existing Firebase Admin instance');
      return firebaseApp;
    }

    // Clean up any existing apps
    const existingApps = admin.apps.filter((app): app is admin.app.App => app !== null);
    await Promise.all(existingApps.map(app => app.delete()));
    
    // Validate environment variables
    const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    console.log('[FIREBASE] Checking credentials...');
    console.log('[FIREBASE] Project ID exists:', !!projectId);
    console.log('[FIREBASE] Client Email exists:', !!clientEmail);
    console.log('[FIREBASE] Private Key exists:', !!privateKey);

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error('Missing required Firebase credentials. Check environment variables.');
    }

    // Format private key
    const formattedKey = formatPrivateKey(privateKey);
    
    // Initialize app with credentials
    console.log('[FIREBASE] Initializing Firebase Admin with project:', projectId);
    const region = 'asia-southeast1';
    const databaseURL = `https://${projectId}-default-rtdb.${region}.firebasedatabase.app`;

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: formattedKey,
      }),
      databaseURL
    });

    // Verify services
    console.log('[FIREBASE] Verifying Firebase services...');
    
    // Test Auth service
    const auth = getAuth(firebaseApp);
    await auth.listUsers(1);
    console.log('[FIREBASE] Auth service verified');

    // Test Database service
    const db = getDatabase(firebaseApp);
    await db.ref('.info/connected').once('value');
    console.log('[FIREBASE] Database connection verified');

    console.log('[FIREBASE] Firebase Admin initialized successfully');
    return firebaseApp;

  } catch (error) {
    console.error('[FIREBASE] Initialization error:', error);
    
    // Clean up failed instance
    if (firebaseApp) {
      await firebaseApp.delete();
      firebaseApp = null;
    }
    
    throw new Error(
      `Firebase initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

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
  const db = getDatabase(getFirebaseAdmin());
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
  const app = getFirebaseAdmin();
  const db = getDatabase(app);
  const auth = getAuth(app);
  const timestamp = Date.now();
  
  try {
    await auth.getUser(userId);
    
    const permissions = customPermissions || DefaultPermissions[role];
    
    await db.ref(`roles/${userId}`).set({
      role,
      permissions,
      updatedAt: timestamp
    });
    
    await db.ref(`role-history/${userId}`).push({
      role,
      permissions,
      timestamp,
      type: 'role_update'
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
  } catch (error) {
    console.error('[FIREBASE] Error updating user role:', error);
    throw error;
  }
}

// User listing function
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