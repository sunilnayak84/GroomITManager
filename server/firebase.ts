import admin from 'firebase-admin';
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

// Track all initialized Firebase instances
const firebaseInstances: admin.app.App[] = [];

export function getFirebaseAdmin(): admin.app.App {
  const instance = firebaseInstances[0];
  if (!instance) {
    throw new Error('Firebase Admin not initialized. Call initializeFirebaseAdmin first.');
  }
  return instance;
}

async function cleanupFirebaseInstances(): Promise<void> {
  console.log('[FIREBASE] Starting Firebase instance cleanup...');
  
  try {
    // Clean up admin.apps first
    if (admin.apps && admin.apps.length > 0) {
      console.log(`[FIREBASE] Found ${admin.apps.length} Firebase instances to clean up`);
      
      await Promise.all(admin.apps.map(async (app) => {
        if (app) {
          try {
            await app.delete();
            console.log('[FIREBASE] Successfully deleted Firebase instance');
          } catch (error) {
            if (error instanceof Error && !error.message.includes('already been deleted')) {
              console.warn('[FIREBASE] Error deleting instance:', error);
            }
          }
        }
      }));
    }
    
    // Clear the tracked instances array
    firebaseInstances.length = 0;
    console.log('[FIREBASE] Firebase instance cleanup completed');
  } catch (error) {
    console.warn('[FIREBASE] Non-fatal error during cleanup:', error);
    // Don't throw error, just log warning and continue
  }
}

function formatPrivateKey(key: string): string {
  try {
    console.log('[FIREBASE] Starting private key formatting...');
    
    if (!key) {
      throw new Error('Private key is empty or undefined');
    }

    // Clean the key
    let cleanKey = key.replace(/['"]/g, '').trim();

    // Handle potential base64 encoding
    if (cleanKey.match(/^[A-Za-z0-9+/=]+$/)) {
      try {
        const decoded = Buffer.from(cleanKey, 'base64').toString('utf8');
        if (decoded.includes('PRIVATE KEY')) {
          console.log('[FIREBASE] Successfully decoded base64 private key');
          cleanKey = decoded;
        }
      } catch (e) {
        console.log('[FIREBASE] Key is not base64 encoded, proceeding with original');
      }
    }

    // Normalize line endings
    cleanKey = cleanKey
      .replace(/\\n/g, '\n')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');

    // Add PEM headers if missing
    if (!cleanKey.includes('-----BEGIN PRIVATE KEY-----')) {
      cleanKey = `-----BEGIN PRIVATE KEY-----\n${cleanKey.split('\n').join('')}\n-----END PRIVATE KEY-----`;
    }

    // Format key content
    const keyParts = cleanKey.split(/-----[^-]+-----/);
    if (keyParts.length === 3) {
      const keyContent = keyParts[1].trim().match(/.{1,64}/g)?.join('\n') || '';
      cleanKey = `-----BEGIN PRIVATE KEY-----\n${keyContent}\n-----END PRIVATE KEY-----`;
    }

    // Validate final format
    if (!cleanKey.match(/^-----BEGIN PRIVATE KEY-----\n[\s\S]+\n-----END PRIVATE KEY-----$/)) {
      throw new Error('Invalid private key format after formatting');
    }

    console.log('[FIREBASE] Private key formatted successfully');
    return cleanKey;
  } catch (error) {
    console.error('[FIREBASE] Error formatting private key:', error);
    throw new Error('Failed to format private key: ' + 
      (error instanceof Error ? error.message : 'Unknown error'));
  }
}

export async function initializeFirebaseAdmin(): Promise<admin.app.App> {
  console.log('[FIREBASE] Starting Firebase Admin initialization...');
  
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000; // 2 seconds

  async function validateCredentials() {
    const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    console.log('[FIREBASE] Validating credentials...');
    
    if (!projectId || !clientEmail || !privateKey) {
      const missing = [];
      if (!projectId) missing.push('FIREBASE_PROJECT_ID');
      if (!clientEmail) missing.push('FIREBASE_CLIENT_EMAIL');
      if (!privateKey) missing.push('FIREBASE_PRIVATE_KEY');
      throw new Error(`Missing required Firebase credentials: ${missing.join(', ')}`);
    }

    return { projectId, clientEmail, privateKey };
  }

  // Always clean up existing instances first
  await cleanupFirebaseInstances();

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[FIREBASE] Initialization attempt ${attempt}/${MAX_RETRIES}`);
      
      // Clean up any existing instances
      await cleanupFirebaseInstances();

      // Get and validate credentials
      const { projectId, clientEmail, privateKey } = await validateCredentials();

      // Format private key
      console.log('[FIREBASE] Formatting private key...');
      const formattedKey = formatPrivateKey(privateKey);
      
      // Initialize new app instance
      console.log(`[FIREBASE] Initializing new Firebase Admin instance...`);
      
      const region = 'asia-southeast1';
      const databaseURL = `https://${projectId}-default-rtdb.${region}.firebasedatabase.app`;
      
      // Create the app with minimal configuration first
      const newApp = admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey: formattedKey
          }),
          databaseURL
        }, `app-${Date.now()}`); // Unique name to avoid conflicts

      // Basic verification
      const auth = getAuth(newApp);
      if (!auth) {
        throw new Error('Failed to initialize Auth service');
      }

      // Store the instance
      firebaseInstances.push(newApp);
      console.log('[FIREBASE] ✓ Firebase Admin initialized successfully');
      
      return newApp;

    } catch (error) {
      console.error(`[FIREBASE] Initialization attempt ${attempt} failed:`, error);
      
      if (attempt === MAX_RETRIES) {
        console.error('[FIREBASE] All initialization attempts failed');
        throw error;
      }

      console.log(`[FIREBASE] Waiting ${RETRY_DELAY}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }

  throw new Error('Firebase initialization failed under unexpected circumstances');
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