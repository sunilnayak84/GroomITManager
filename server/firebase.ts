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
  try {
    console.log('[FIREBASE] Starting private key formatting...');
    
    if (!key) {
      throw new Error('Private key is empty or undefined');
    }

    // Clean the key: remove quotes and whitespace
    let cleanKey = key.replace(/['"]/g, '').trim();

    // Handle potential base64 encoding
    if (cleanKey.match(/^[A-Za-z0-9+/=]+$/)) {
      try {
        const decoded = Buffer.from(cleanKey, 'base64').toString('utf8');
        // Verify the decoded content looks like a private key
        if (decoded.includes('PRIVATE KEY')) {
          console.log('[FIREBASE] Successfully decoded base64 private key');
          cleanKey = decoded;
        }
      } catch (e) {
        console.log('[FIREBASE] Key is not base64 encoded, proceeding with original');
      }
    }

    // Handle newlines
    cleanKey = cleanKey
      .replace(/\\n/g, '\n')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');


    // Ensure the key has the proper PEM format
    if (!cleanKey.includes('-----BEGIN PRIVATE KEY-----')) {
      cleanKey = `-----BEGIN PRIVATE KEY-----\n${cleanKey.split('\n').join('')}\n-----END PRIVATE KEY-----`;
    }

    // Ensure proper formatting of the PEM content
    const keyParts = cleanKey.split(/-----[^-]+-----/);
    if (keyParts.length === 3) {
      const keyContent = keyParts[1].trim().match(/.{1,64}/g)?.join('\n') || '';
      cleanKey = `-----BEGIN PRIVATE KEY-----\n${keyContent}\n-----END PRIVATE KEY-----`;
    }

    // Final validation
    const validationRegex = /^-----BEGIN PRIVATE KEY-----\n[\s\S]+\n-----END PRIVATE KEY-----$/;
    if (!validationRegex.test(cleanKey)) {
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
  
  // Maximum number of retries for initialization
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000; // 2 seconds
  const STARTUP_TIMEOUT = 10000; // 10 seconds
  
  async function cleanupExistingInstances() {
    console.log('[FIREBASE] Cleaning up existing Firebase instances...');
    const existingApps = admin.apps?.filter((app): app is admin.app.App => app !== null) || [];
    if (existingApps.length > 0) {
      console.log(`[FIREBASE] Found ${existingApps.length} existing Firebase instances to clean up`);
      try {
        await Promise.allSettled(existingApps.map(app => app.delete()));
        console.log('[FIREBASE] Successfully cleaned up existing Firebase instances');
      } catch (error) {
        console.warn('[FIREBASE] Error during cleanup:', error);
        // Continue despite cleanup errors
      }
      // Reset our cached instance
      firebaseApp = null;
    }
  }

  // Add timeout wrapper for async operations
  function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error(`${operation} timed out after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  }

  async function validateCredentials() {
    const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    console.log('[FIREBASE] Validating credentials...');
    console.log('[FIREBASE] Project ID:', projectId ? 'Valid' : 'Missing');
    console.log('[FIREBASE] Client Email:', clientEmail ? 'Valid' : 'Missing');
    console.log('[FIREBASE] Private Key:', privateKey ? 'Present' : 'Missing');

    if (!projectId || !clientEmail || !privateKey) {
      const missing = [];
      if (!projectId) missing.push('FIREBASE_PROJECT_ID');
      if (!clientEmail) missing.push('FIREBASE_CLIENT_EMAIL');
      if (!privateKey) missing.push('FIREBASE_PRIVATE_KEY');
      throw new Error(`Missing required Firebase credentials: ${missing.join(', ')}`);
    }

    return { projectId, clientEmail, privateKey };
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[FIREBASE] Initialization attempt ${attempt}/${MAX_RETRIES}`);
      
      // Clean up existing instances with timeout
      await withTimeout(
        cleanupExistingInstances(),
        STARTUP_TIMEOUT,
        'Firebase cleanup'
      );

      // Return existing instance if somehow still available after cleanup
      if (firebaseApp) {
        console.log('[FIREBASE] Using existing Firebase Admin instance');
        const auth = getAuth(firebaseApp);
        await withTimeout(
          auth.listUsers(1),
          STARTUP_TIMEOUT,
          'Firebase Auth verification'
        );
        return firebaseApp;
      }

      // Validate and get credentials
      const { projectId, clientEmail, privateKey } = await validateCredentials();

      // Format private key with detailed logging
      console.log('[FIREBASE] Formatting private key...');
      const formattedKey = formatPrivateKey(privateKey);
      console.log('[FIREBASE] Private key formatted successfully');
      
      // Initialize app with credentials
      console.log(`[FIREBASE] Initializing Firebase Admin (Attempt ${attempt}/${MAX_RETRIES})...`);
      
      const region = 'asia-southeast1';
      const databaseURL = `https://${projectId}-default-rtdb.${region}.firebasedatabase.app`;
      console.log('[FIREBASE] Database URL:', databaseURL);

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
      console.log('[FIREBASE] ✓ Auth service verified');

      // Test Database service
      const db = getDatabase(firebaseApp);
      await db.ref('.info/connected').once('value');
      console.log('[FIREBASE] ✓ Database connection verified');

      console.log('[FIREBASE] ✓ Firebase Admin initialized successfully');
      return firebaseApp;

    } catch (error) {
      console.error(`[FIREBASE] Initialization attempt ${attempt} failed:`, error);
      
      // Clean up failed instance
      if (firebaseApp) {
        try {
          await firebaseApp.delete();
        } catch (cleanupError) {
          console.warn('[FIREBASE] Error during cleanup after failed initialization:', cleanupError);
        }
        firebaseApp = null;
      }

      if (attempt === MAX_RETRIES) {
        throw new Error(
          `Firebase initialization failed after ${MAX_RETRIES} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }

      // Wait before retrying
      console.log(`[FIREBASE] Waiting ${RETRY_DELAY}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }

  // This should never be reached due to the throw in the last iteration
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