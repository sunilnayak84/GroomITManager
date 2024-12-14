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

// Firebase Admin initialization
let firebaseApp: admin.app.App | null = null;

export function getFirebaseAdmin(): admin.app.App {
  if (!firebaseApp) {
    throw new Error('Firebase Admin not initialized. Call initializeFirebaseAdmin first.');
  }
  return firebaseApp;
}

export async function initializeFirebaseAdmin(): Promise<admin.app.App> {
  if (firebaseApp) {
    console.log('[FIREBASE] Using existing Firebase Admin instance');
    return firebaseApp;
  }

  try {
    console.log('[FIREBASE] Starting Firebase Admin initialization...');
    
    // Get environment variables with detailed logging
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    console.log('[FIREBASE] Checking credentials...');
    
    // Enhanced credential validation
    if (!projectId?.trim()) {
      throw new Error('[FIREBASE] FIREBASE_PROJECT_ID is missing or empty');
    }
    if (!clientEmail?.trim()) {
      throw new Error('[FIREBASE] FIREBASE_CLIENT_EMAIL is missing or empty');
    }
    if (!privateKey?.trim()) {
      throw new Error('[FIREBASE] FIREBASE_PRIVATE_KEY is missing or empty');
    }

    console.log('[FIREBASE] Credentials validation passed');
    console.log('[FIREBASE] Project ID:', projectId);
    console.log('[FIREBASE] Client Email:', clientEmail);

    // Format private key with improved error handling
    try {
      // Handle different private key formats
      privateKey = privateKey.trim();
      
      // Remove enclosing quotes if present
      if ((privateKey.startsWith('"') && privateKey.endsWith('"')) || 
          (privateKey.startsWith("'") && privateKey.endsWith("'"))) {
        privateKey = privateKey.slice(1, -1);
      }
      
      // Replace escaped newlines with actual newlines
      privateKey = privateKey.replace(/\\n/g, '\n');
      
      // Add key markers if missing
      if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
        privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`;
      }
      
      // Final validation of key format
      if (!privateKey.includes('-----BEGIN PRIVATE KEY-----') || 
          !privateKey.includes('-----END PRIVATE KEY-----')) {
        throw new Error('[FIREBASE] Private key format validation failed');
      }
      
      console.log('[FIREBASE] Private key formatted successfully');
    } catch (error) {
      console.error('[FIREBASE] Private key formatting error:', error instanceof Error ? error.message : 'Unknown error');
      throw new Error('[FIREBASE] Failed to process private key - check the key format');
    }

    // Delete existing app instances with error handling
    if (admin.apps.length) {
      console.log('[FIREBASE] Found existing Firebase Admin apps, cleaning up...');
      await Promise.all(admin.apps.map(app => app?.delete().catch(err => {
        console.warn('[FIREBASE] Error deleting app:', err);
      })));
      console.log('[FIREBASE] Cleanup completed');
    }

    // Delete any existing Firebase Admin instances
    if (admin.apps.length) {
      console.log('[FIREBASE] Cleaning up existing Firebase Admin instances...');
      await Promise.all(
        admin.apps.map(app => 
          app?.delete().catch(err => 
            console.warn('[FIREBASE] Error during cleanup:', err instanceof Error ? err.message : 'Unknown error')
          )
        )
      );
    }

    // Initialize Firebase Admin with enhanced configuration
    console.log('[FIREBASE] Creating new Firebase Admin instance...');
    
    // Configure database URL based on region
    const region = process.env.FIREBASE_REGION || 'asia-southeast1';
    const databaseURL = `https://${projectId}-default-rtdb.${region}.firebasedatabase.app`;
    console.log('[FIREBASE] Using database URL:', databaseURL);

    // Initialize with retries
    const MAX_RETRIES = 3;
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`[FIREBASE] Initialization attempt ${attempt}/${MAX_RETRIES}`);
        
        // Create app instance
        const app = admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
          }),
          databaseURL
        }, `app-${Date.now()}`); // Unique name for each attempt
        
        // Verify services sequentially
        console.log('[FIREBASE] Verifying Firebase Admin services...');
        
        // 1. Verify Auth Service
        const auth = getAuth(app);
        await auth.listUsers(1)
          .then(() => console.log('[FIREBASE] Auth service verified'))
          .catch(error => {
            console.error('[FIREBASE] Auth verification failed:', error);
            throw new Error('Auth service verification failed');
          });
        
        // 2. Verify Database Service
        const db = getDatabase(app);
        await db.ref('.info/connected').once('value')
          .then(() => console.log('[FIREBASE] Database service verified'))
          .catch(error => {
            console.error('[FIREBASE] Database verification failed:', error);
            throw new Error('Database service verification failed');
          });
        
        console.log('[FIREBASE] All Firebase Admin services initialized successfully');
        firebaseApp = app;
        return app;
    } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error during initialization');
        console.error(`[FIREBASE] Attempt ${attempt} failed:`, lastError.message);
        
        // Cleanup failed attempt
        try {
          const apps = admin.apps.filter(app => app !== null);
          await Promise.all(apps.map(app => app!.delete()));
          console.log('[FIREBASE] Cleaned up failed initialization attempt');
        } catch (cleanupError) {
          console.warn('[FIREBASE] Cleanup warning:', cleanupError);
        }
        
        if (attempt === MAX_RETRIES) {
          console.error('[FIREBASE] All initialization attempts failed');
          throw lastError;
        }
        
        // Wait before retrying
        const delay = attempt * 1000; // Incremental delay
        console.log(`[FIREBASE] Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw new Error('[FIREBASE] Failed to initialize after all retry attempts');
  } catch (error) {
    console.error('[FIREBASE] Critical initialization error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'UnknownError',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Final cleanup
    try {
      const apps = admin.apps.filter(app => app !== null);
      await Promise.all(apps.map(app => app!.delete()));
      firebaseApp = null;
      console.log('[FIREBASE] Final cleanup completed');
    } catch (cleanupError) {
      console.error('[FIREBASE] Final cleanup failed:', cleanupError);
    }
    
    throw error;
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
  const db = await getDatabase(await initializeFirebaseAdmin());
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
  const app = await initializeFirebaseAdmin();
  const db = getDatabase(app);
  const auth = getAuth(app);
  const timestamp = Date.now();
  
  try {
    // Get user record to verify existence
    await auth.getUser(userId);
    
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
    console.error('[FIREBASE] Error updating user role:', error);
    throw error;
  }
}

// User listing function
export async function listAllUsers(pageToken?: string) {
  const auth = getAuth(await initializeFirebaseAdmin());
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
  const db = getDatabase(await initializeFirebaseAdmin());
  const snapshot = await db.ref('role-definitions').once('value');
  return snapshot.val() || InitialRoleConfigs;
}

export async function updateRoleDefinition(
  roleName: string,
  permissions: Permission[],
  description?: string
) {
  const db = getDatabase(await initializeFirebaseAdmin());
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