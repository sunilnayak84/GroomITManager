import admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';
import { getFirestore } from 'firebase-admin/firestore';

// Role Types
enum RoleTypes {
  admin = 'admin',
  staff = 'staff',
  manager = 'manager',
  receptionist = 'receptionist',
  groomer = 'groomer',
  trainer = 'trainer',
  vet = 'vet',
  boarder = 'boarder',
  walker = 'walker',
  customer = 'customer'
}

// All available permissions
const ALL_PERMISSIONS = [
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

// Define Permission type once
export type Permission = typeof ALL_PERMISSIONS[number];

// Default permissions for each role
const DefaultPermissions: Record<RoleTypes, Permission[]> = {
  [RoleTypes.admin]: ['all'],
  [RoleTypes.manager]: [
    'manage_appointments',
    'view_appointments',
    'manage_services',
    'view_services',
    'manage_customers',
    'view_customers',
    'manage_inventory',
    'view_inventory',
    'manage_staff_schedule'
  ],
  [RoleTypes.staff]: [
    'view_appointments',
    'manage_own_schedule',
    'view_customers'
  ],
  [RoleTypes.groomer]: [
    'view_appointments',
    'manage_own_schedule',
    'view_customers',
    'create_appointments'
  ],
  [RoleTypes.walker]: [
    'view_appointments',
    'manage_own_schedule',
    'view_customers'
  ],
  [RoleTypes.trainer]: [
    'view_appointments',
    'manage_own_schedule',
    'view_customers'
  ],
  [RoleTypes.vet]: [
    'view_appointments',
    'manage_own_schedule',
    'view_customers',
    'create_appointments'
  ],
  [RoleTypes.boarder]: [
    'view_appointments',
    'manage_own_schedule',
    'view_customers'
  ],
  [RoleTypes.receptionist]: [
    'view_appointments',
    'create_appointments',
    'view_customers',
    'create_customers'
  ],
  [RoleTypes.customer]: [
    'view_appointments',
    'create_appointments',
    'view_services'
  ]
};

// Cache role permissions for better performance
const permissionsCache = new Map<RoleTypes, { permissions: Permission[], timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

let firebaseApp: admin.app.App | null = null;
const MAX_INIT_RETRIES = 3;
const INIT_RETRY_DELAY = 2000;

// Firebase Admin initialization
async function getFirebaseAdmin(): Promise<admin.app.App> {
  if (firebaseApp) {
    return firebaseApp;
  }

  let privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (privateKey) {
    privateKey = privateKey.replace(/\\n/g, '\n');
    if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
      privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`;
    }
  }

  // Initialize Realtime Database URL
  const databaseURL = process.env.FIREBASE_DATABASE_URL || 
    `https://${process.env.FIREBASE_PROJECT_ID}-default-rtdb.asia-southeast1.firebasedatabase.app`;
  
  if (!privateKey || !process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL) {
    console.error('[FIREBASE] Missing required credentials:',
      !privateKey ? 'FIREBASE_PRIVATE_KEY' : '',
      !process.env.FIREBASE_PROJECT_ID ? 'FIREBASE_PROJECT_ID' : '',
      !process.env.FIREBASE_CLIENT_EMAIL ? 'FIREBASE_CLIENT_EMAIL' : ''
    );
    throw new Error('Missing Firebase credentials. Check environment variables.');
  }

  try {
    console.log('[FIREBASE] Initializing Firebase Admin...');
    if (admin.apps.length === 0) {
      const config = {
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey
        }),
        databaseURL: databaseURL
      };
      
      firebaseApp = admin.initializeApp(config);
      
      // Initialize Realtime Database
      const db = admin.database();
      try {
        await db.ref('.info/connected').once('value');
      } catch (error) {
        console.error('[FIREBASE] Database connection error:', error);
      }
    } else {
      firebaseApp = admin.app();
    }

    // Verify the initialization by making a test call
    const auth = getAuth(firebaseApp);
    await auth.listUsers(1);
    
    console.log('[FIREBASE] Firebase Admin initialized successfully');
    return firebaseApp;
  } catch (error) {
    console.error('[FIREBASE] Failed to initialize Firebase Admin:', error);
    firebaseApp = null;
    throw error;
  }
}

async function initializeFirebaseAdmin(): Promise<admin.app.App> {
  let attempt = 1;
  let lastError: Error | null = null;

  while (attempt <= MAX_INIT_RETRIES) {
    try {
      console.log(`[FIREBASE] Initialization attempt ${attempt}/${MAX_INIT_RETRIES}`);
      return await getFirebaseAdmin();
    } catch (error) {
      console.error(`[FIREBASE] Attempt ${attempt} failed:`, error);
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === MAX_INIT_RETRIES) {
        console.error('[FIREBASE] Maximum retry attempts reached');
        throw lastError;
      }

      await new Promise(resolve => setTimeout(resolve, INIT_RETRY_DELAY));
      attempt++;
    }
  }

  throw lastError || new Error('Failed to initialize Firebase Admin');
}

// Role and permission management functions
async function getRolePermissions(role: RoleTypes): Promise<Permission[]> {
  const app = await getFirebaseAdmin();
  const db = admin.database();
  const snapshot = await db.ref(`role-definitions/${role}`).once('value');
  const roleData = snapshot.val();
  
  if (!roleData || !roleData.permissions) {
    console.warn(`[ROLES] No permissions found for role ${role}, using empty set`);
    return [];
  }
  
  const validPermissions = validatePermissions(roleData.permissions);
  if (validPermissions.length !== roleData.permissions.length) {
    console.warn(`[ROLES] Some permissions were invalid for role ${role}`);
  }
  
  return validPermissions;
}

async function getDefaultPermissions(role: RoleTypes): Promise<Permission[]> {
  const now = Date.now();
  const cached = permissionsCache.get(role);
  
  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    return cached.permissions;
  }
  
  const permissions = await getRolePermissions(role);
  permissionsCache.set(role, { permissions, timestamp: now });
  
  return permissions;
}

// Permission validation functions
function isValidPermission(permission: unknown): permission is Permission {
  if (typeof permission !== 'string') return false;
  return ALL_PERMISSIONS.includes(permission as Permission);
}

function validatePermissions(permissions: unknown[]): Permission[] {
  return permissions.filter(isValidPermission);
}

// User management functions
async function getUserRole(userId: string): Promise<{ role: RoleTypes; permissions: Permission[] }> {
  try {
    const app = await getFirebaseAdmin();
    const db = admin.database(app);
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
      permissions: roleData.permissions || DefaultPermissions[roleData.role as RoleTypes]
    };
  } catch (error) {
    console.error('[FIREBASE] Error getting user role:', error);
    return {
      role: RoleTypes.staff,
      permissions: DefaultPermissions[RoleTypes.staff]
    };
  }
}

async function updateUserRole(
  userId: string,
  role: RoleTypes,
  customPermissions?: Permission[]
): Promise<{ success: boolean; role: RoleTypes; permissions: Permission[] }> {
  const app = getFirebaseAdmin();
  const db = getDatabase(app);
  const auth = getAuth(app);
  const timestamp = Date.now();
  
  await auth.getUser(userId);
  
  const permissions = customPermissions || DefaultPermissions[role];
  
  // Save to role history
  const historyRef = db.ref(`role-history/${userId}`);
  await historyRef.push({
    action: 'role_update',
    previousRole: DefaultPermissions[role],
    newRole: role,
    previousPermissions: customPermissions || [],
    newPermissions: permissions || [],
    timestamp: Date.now(),
    type: 'role_change'
  });

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

async function setupAdminUser(adminEmail: string): Promise<void> {
  // Validate admin email domain
  if (!adminEmail.endsWith('@groomery.in') && process.env.NODE_ENV !== 'development') {
    throw new Error('Admin email must be from the @groomery.in domain');
  }

  const app = getFirebaseAdmin();
  const auth = getAuth(app);
  const db = getDatabase(app);
  
  let userRecord;
  try {
    userRecord = await auth.getUserByEmail(adminEmail);
    console.log('[SETUP-ADMIN] Found existing admin user:', userRecord.uid);
  } catch (error) {
    console.log('[SETUP-ADMIN] Creating new admin user with email:', adminEmail);
    userRecord = await auth.createUser({
      email: adminEmail,
      emailVerified: true,
      displayName: 'System Admin',
    });
  }
  
  const userId = userRecord.uid;
  const timestamp = Date.now();

  // Ensure admin has ALL permissions
  const adminPermissions = [...ALL_PERMISSIONS, 'all'];
  
  // Set role data with full permissions
  const roleData = {
    role: RoleTypes.admin,
    permissions: adminPermissions,
    isAdmin: true,
    updatedAt: timestamp,
    createdAt: timestamp
  };

  // Update role in database
  await db.ref(`roles/${userId}`).set(roleData);
  
  // Set custom claims with full permissions
  await auth.setCustomUserClaims(userId, {
    role: RoleTypes.admin,
    permissions: adminPermissions,
    isAdmin: true,
    updatedAt: timestamp
  });

  // Record in role history
  await db.ref(`role-history/${userId}`).push({
    action: 'admin_setup',
    role: RoleTypes.admin,
    permissions: adminPermissions,
    timestamp,
    type: 'system_update'
  });

  console.log('[SETUP-ADMIN] Admin user setup completed for:', userId);
}

async function listAllUsers(pageToken?: string) {
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

// Initial role configurations
const InitialRoleConfigs = {
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
  },
  [RoleTypes.customer]: {
    permissions: DefaultPermissions[RoleTypes.customer],
    description: 'Customer access for booking appointments and viewing services',
    isSystem: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
};

// Role definitions management
async function getRoleDefinitions() {
  const db = getDatabase(getFirebaseAdmin());
  const snapshot = await db.ref('role-definitions').once('value');
  return snapshot.val() || InitialRoleConfigs;
}

async function updateRoleDefinition(
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

// Export all necessary functionality
export {
  RoleTypes,
  DefaultPermissions,
  InitialRoleConfigs,
  getDefaultPermissions,
  validatePermissions,
  isValidPermission,
  getFirebaseAdmin,
  initializeFirebaseAdmin,
  setupAdminUser,
  listAllUsers,
  updateUserRole,
  getUserRole,
  ALL_PERMISSIONS,
  getRoleDefinitions,
  updateRoleDefinition
};