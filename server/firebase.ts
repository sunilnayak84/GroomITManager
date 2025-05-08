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
let initializationAttempts = 0;
const MAX_INIT_ATTEMPTS = 3;

export function initializeFirebaseAdmin(): admin.app.App {
  if (firebaseApp) {
    try {
      // Test if the existing app is still valid
      const auth = admin.auth(firebaseApp);
      return firebaseApp;
    } catch (error) {
      console.log('[FIREBASE] Existing Firebase app is invalid, reinitializing...');
      firebaseApp = null; // Reset so we can create a new one
    }
  }

  // Check if we're in development mode
  const isDevelopment = process.env.NODE_ENV === 'development';

  try {
    console.log('[FIREBASE] Starting Firebase Admin initialization...');

    // For development mode, try to create a minimal app
    if (isDevelopment) {
      console.log('[FIREBASE] Initializing in development mode');
      try {
        firebaseApp = admin.initializeApp({
          projectId: 'demo-project',
          credential: admin.credential.applicationDefault()
        });
        console.log('[FIREBASE] Development mode initialization successful');
        return firebaseApp;
      } catch (devError) {
        console.warn('[FIREBASE] Standard development initialization failed, trying minimal config:', devError.message);
        
        try {
          // Try with minimal config
          firebaseApp = admin.initializeApp({
            projectId: 'demo-project'
          });
          console.log('[FIREBASE] Minimal development initialization successful');
          return firebaseApp;
        } catch (minimalError) {
          console.error('[FIREBASE] Minimal initialization failed:', minimalError.message);
          
          // Last resort - get existing app or create a new emulator app
          if (admin.apps.length > 0) {
            firebaseApp = admin.apps[0] as admin.app.App;
            console.log('[FIREBASE] Using existing Firebase app');
            return firebaseApp;
          }
          
          // Create an emulator-compatible app
          firebaseApp = admin.initializeApp({
            projectId: 'demo-project',
            databaseURL: 'http://localhost:9000?ns=demo-project'
          });
          console.log('[FIREBASE] Created emulator-compatible Firebase app');
          return firebaseApp;
        }
      }
    }

    // Production initialization
    try {
      let serviceAccountData;

      // Try to get credentials from environment variable first
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        try {
          serviceAccountData = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
          console.log('[FIREBASE] Using service account from environment variable');
        } catch (parseError) {
          console.error('[FIREBASE] Failed to parse FIREBASE_SERVICE_ACCOUNT:', parseError.message);
          throw new Error('Invalid service account in environment variable');
        }
      } else {
        // Fallback to file if environment variable is not available
        try {
          const serviceAccountPath = join(__dirname, '../serviceAccount.json');
          const serviceAccountContent = readFileSync(serviceAccountPath, 'utf8');
          serviceAccountData = JSON.parse(serviceAccountContent);
          console.log('[FIREBASE] Using service account from file');
        } catch (fileError) {
          console.error('[FIREBASE] Failed to read service account file:', fileError.message);
          
          // If in development and file not found, fall back to minimal config
          if (isDevelopment) {
            firebaseApp = admin.initializeApp({
              projectId: 'demo-project'
            });
            console.log('[FIREBASE] No service account found, using minimal config for development');
            return firebaseApp;
          } else {
            throw new Error('No valid service account found');
          }
        }
      }

      if (!serviceAccountData.project_id) {
        throw new Error('Invalid service account data: missing project_id');
      }

      // Format private key correctly if it exists
      let credentials;
      if (serviceAccountData.private_key && serviceAccountData.client_email) {
        let privateKey = serviceAccountData.private_key;
        privateKey = privateKey.replace(/\\n/g, '\n').replace(/^['"]|['"]$/g, '');
        if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
          privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`;
        }
        
        credentials = admin.credential.cert({
          projectId: serviceAccountData.project_id,
          privateKey: privateKey,
          clientEmail: serviceAccountData.client_email,
        });
      } else {
        // Use application default if we don't have complete cert data
        credentials = admin.credential.applicationDefault();
        console.log('[FIREBASE] Using application default credentials');
      }

      console.log('[FIREBASE] Initializing with service account for project:', serviceAccountData.project_id);

      const databaseURL = serviceAccountData.databaseURL || 
        `https://${serviceAccountData.project_id}-default-rtdb.asia-southeast1.firebasedatabase.app`;

      firebaseApp = admin.initializeApp({
        credential: credentials,
        projectId: serviceAccountData.project_id,
        databaseURL: databaseURL
      });

      console.log('[FIREBASE] Production initialization successful');
      return firebaseApp;
    } catch (error) {
      console.error('[FIREBASE] Service account initialization failed:', error.message);
      
      // If in development mode, fallback to minimal config
      if (isDevelopment) {
        firebaseApp = admin.initializeApp({
          projectId: 'demo-project'
        });
        console.log('[FIREBASE] Fallback to minimal config for development after production init failure');
        return firebaseApp;
      }
      
      throw error;
    }
  } catch (error) {
    console.error('[FIREBASE] Initialization error:', error.message);

    // Last resort for development - use a completely minimal app
    if (isDevelopment && initializationAttempts < MAX_INIT_ATTEMPTS) {
      initializationAttempts++;
      console.log(`[FIREBASE] Final attempt at minimal initialization (Attempt ${initializationAttempts}/${MAX_INIT_ATTEMPTS})`);

      try {
        // Delete any existing apps first
        for (const app of admin.apps) {
          if (app) {
            try {
              app.delete().catch(() => {});
            } catch (e) {
              // Ignore errors
            }
          }
        }
        
        firebaseApp = admin.initializeApp({
          projectId: 'demo-project-' + new Date().getTime()
        });
        console.log('[FIREBASE] Final minimal initialization successful');
        return firebaseApp;
      } catch (finalError) {
        console.error('[FIREBASE] All initialization attempts failed');
      }
    }

    // For development, return a mock app as last resort
    if (isDevelopment) {
      console.warn('[FIREBASE] Development mode: Creating mock Firebase app');
      const mockApp = {
        name: '[DEFAULT]',
        options: { projectId: 'mock-project' },
        auth: function() { return {} },
        firestore: function() { return {} },
        database: function() { return {} }
      } as unknown as admin.app.App;
      firebaseApp = mockApp;
      return firebaseApp;
    }

    throw error;
  }
}

export function getFirebaseAdmin(): admin.app.App {
  return initializeFirebaseAdmin();
}

// Export the admin instance
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

// Create a union type of all permissions using proper type inference
type PermissionValue<T> = T extends { [key: string]: infer U } ? U : never;
type CategoryPermissions = typeof PermissionCategories[keyof typeof PermissionCategories];
export type Permission = PermissionValue<CategoryPermissions>;

// Categorized permissions for better management
export const PermissionCategories = {
  APPOINTMENTS: {
    MANAGE: 'manage_appointments',
    VIEW: 'view_appointments',
    CREATE: 'create_appointments',
    CANCEL: 'cancel_appointments',
    RESCHEDULE: 'reschedule_appointments'
  } as const,
  CUSTOMERS: {
    MANAGE: 'manage_customers',
    VIEW: 'view_customers',
    CREATE: 'create_customers',
    EDIT: 'edit_customer_info'
  } as const,
  SERVICES: {
    MANAGE: 'manage_services',
    VIEW: 'view_services',
    CREATE: 'create_services',
    EDIT: 'edit_services',
    PRICING: 'set_service_pricing'
  } as const,
  STAFF: {
    MANAGE: 'manage_staff',
    VIEW: 'view_staff',
    SCHEDULE: 'manage_staff_schedule',
    VIEW_SCHEDULE: 'view_staff_schedule'
  } as const,
  SYSTEM: {
    ALL: 'all',
    MANAGE_ROLES: 'manage_roles',
    VIEW_ANALYTICS: 'view_analytics',
    VIEW_REPORTS: 'view_reports'
  } as const
} as const;

// Default permissions for each role
export const DefaultPermissions: Record<RoleTypes, Permission[]> = {
  [RoleTypes.admin]: [PermissionCategories.SYSTEM.ALL],
  [RoleTypes.manager]: [
    PermissionCategories.APPOINTMENTS.MANAGE,
    PermissionCategories.APPOINTMENTS.VIEW,
    PermissionCategories.APPOINTMENTS.CREATE,
    PermissionCategories.APPOINTMENTS.CANCEL,
    PermissionCategories.SERVICES.MANAGE,
    PermissionCategories.SERVICES.VIEW,
    PermissionCategories.CUSTOMERS.MANAGE,
    PermissionCategories.CUSTOMERS.VIEW,
    PermissionCategories.STAFF.SCHEDULE,
    PermissionCategories.STAFF.VIEW_SCHEDULE,
    PermissionCategories.SYSTEM.VIEW_ANALYTICS,
    PermissionCategories.SYSTEM.VIEW_REPORTS
  ],
  [RoleTypes.staff]: [
    PermissionCategories.APPOINTMENTS.VIEW,
    PermissionCategories.CUSTOMERS.VIEW,
    PermissionCategories.SERVICES.VIEW,
    PermissionCategories.STAFF.VIEW_SCHEDULE
  ],
  [RoleTypes.receptionist]: [
    PermissionCategories.APPOINTMENTS.CREATE,
    PermissionCategories.APPOINTMENTS.VIEW,
    PermissionCategories.CUSTOMERS.CREATE,
    PermissionCategories.CUSTOMERS.VIEW,
    PermissionCategories.SERVICES.VIEW
  ]
};

// Role configurations with metadata
export const InitialRoleConfigs = {
  [RoleTypes.admin]: {
    permissions: DefaultPermissions[RoleTypes.admin],
    description: 'Full system access with all permissions',
    isSystem: true,
    canBeModified: false,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  [RoleTypes.manager]: {
    permissions: DefaultPermissions[RoleTypes.manager],
    description: 'Manages daily operations and staff',
    isSystem: true,
    canBeModified: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  [RoleTypes.staff]: {
    permissions: DefaultPermissions[RoleTypes.staff],
    description: 'Regular staff member access',
    isSystem: true,
    canBeModified: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  [RoleTypes.receptionist]: {
    permissions: DefaultPermissions[RoleTypes.receptionist],
    description: 'Front desk and customer service access',
    isSystem: true,
    canBeModified: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
};

// Role validation helper
export function isValidRole(role: unknown): role is RoleTypes {
  return typeof role === 'string' && Object.values(RoleTypes).includes(role as RoleTypes);
}

// Permission validation helper
export function isValidPermission(permission: unknown): permission is Permission {
  if (typeof permission !== 'string') return false;
  return Object.values(PermissionCategories).some(category =>
    Object.values(category).includes(permission as Permission)
  );
}

// Role update validation
export function validateRoleUpdate(
  currentRole: RoleTypes,
  newRole: RoleTypes,
  actorRole: RoleTypes
): { valid: boolean; error?: string } {
  if (currentRole === RoleTypes.admin && actorRole !== RoleTypes.admin) {
    return { valid: false, error: 'Only administrators can modify admin roles' };
  }

  if (newRole === RoleTypes.admin && actorRole !== RoleTypes.admin) {
    return { valid: false, error: 'Only administrators can assign admin roles' };
  }

  if (actorRole !== RoleTypes.admin && actorRole !== RoleTypes.manager) {
    return { valid: false, error: 'Insufficient permissions to modify roles' };
  }

  return { valid: true };
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