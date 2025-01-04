import * as admin from 'firebase-admin';
import { getAuth as getFirebaseAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getDatabase } from 'firebase-admin/database';
import { initializeNotifications } from './scripts/initialize-notifications';

// Single instance of Firebase Admin
let firebaseApp: admin.app.App | null = null;

export const getAuth = () => getFirebaseAuth(admin.app());
export const getDatabase = () => {
  if (!admin.apps.length) {
    throw new Error('Firebase Admin not initialized');
  }
  return admin.database();
};
export const getFirestore = () => {
  if (!admin.apps.length) {
    throw new Error('Firebase Admin not initialized');
  }
  return admin.firestore();
};

export enum RoleTypes {
  ADMIN = 'admin',
  CUSTOMER = 'customer',
  STAFF = 'staff',
  RECEPTIONIST = 'receptionist'
}

export const ALL_PERMISSIONS = [
  // Appointment permissions
  'view_appointments',
  'create_appointments',
  'edit_appointments',
  'delete_appointments',
  'manage_appointments',
  'view_all_appointments',
  'view_own_appointments',
  'cancel_appointments',
  'reschedule_appointments',

  // Notification permissions
  'view_notifications',
  'manage_notifications',
  'send_notifications',

  // Customer permissions
  'view_customers',
  'create_customers',
  'edit_customers',
  'delete_customers',
  'manage_customers',

  // Staff permissions
  'view_staff',
  'create_staff',
  'edit_staff',
  'delete_staff',
  'manage_staff',

  // Pet permissions
  'view_pets',
  'create_pets',
  'edit_pets',
  'delete_pets',
  'manage_pets',
  'view_all_pets',
  'view_own_pets',
  'edit_own_pets',
  'delete_own_pets',

  // Service permissions
  'view_services',
  'create_services',
  'edit_services',
  'delete_services',
  'manage_services',

  // Role permissions
  'view_roles',
  'create_roles',
  'edit_roles',
  'delete_roles',
  'manage_roles'
] as const;

export type Permission = typeof ALL_PERMISSIONS[number];

export function isValidPermission(permission: unknown): permission is Permission {
  return typeof permission === 'string' && ALL_PERMISSIONS.includes(permission as Permission);
}

export function validatePermissions(permissions: unknown[]): Permission[] {
  return permissions.filter(isValidPermission);
}

export const DefaultPermissions = {
  [RoleTypes.ADMIN]: ALL_PERMISSIONS,
  [RoleTypes.CUSTOMER]: [
    'view_own_appointments',
    'create_appointments',
    'view_services',
    'view_groomers',
    'manage_own_pets',
    'create_pets',
    'edit_own_pets',
    'delete_own_pets',
    'view_own_pets',
    'cancel_own_appointments',
    'reschedule_own_appointments',
    'view_own_profile',
    'edit_own_profile',
    'view_notifications'
  ],
  [RoleTypes.STAFF]: [
    'view_appointments',
    'create_appointments',
    'edit_appointments',
    'view_customers',
    'view_pets',
    'view_services',
    'view_notifications'
  ],
  [RoleTypes.RECEPTIONIST]: [
    'view_appointments',
    'create_appointments',
    'edit_appointments',
    'view_customers',
    'create_customers',
    'view_pets',
    'view_services',
    'view_notifications'
  ]
};

export const InitialRoleConfigs = {
  [RoleTypes.ADMIN]: {
    permissions: ALL_PERMISSIONS,
    isSystem: true,
    description: 'Full system access',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  [RoleTypes.STAFF]: {
    permissions: DefaultPermissions[RoleTypes.STAFF],
    isSystem: true,
    description: 'Staff member access',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  [RoleTypes.CUSTOMER]: {
    permissions: DefaultPermissions[RoleTypes.CUSTOMER],
    isSystem: true,
    description: 'Customer access',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  [RoleTypes.RECEPTIONIST]: {
    permissions: DefaultPermissions[RoleTypes.RECEPTIONIST],
    isSystem: true,
    description: 'Receptionist access',
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
};

// Initialize Firebase Admin
export async function initializeFirebaseAdmin(): Promise<admin.app.App> {
  if (firebaseApp) {
    return firebaseApp;
  }

  console.log('[FIREBASE] Starting Firebase Admin initialization...');

  // Get environment variables
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  // Validate required environment variables
  if (!projectId || !clientEmail || !privateKey) {
    console.error('[FIREBASE] Missing required environment variables');
    throw new Error('Missing Firebase credentials. Check environment variables.');
  }

  try {
    // Format private key if needed
    if (privateKey) {
      privateKey = privateKey.replace(/\\n/g, '\n');
      if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
        privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`;
      }
    }

    const databaseURL = process.env.FIREBASE_DATABASE_URL || 
      `https://${projectId}-default-rtdb.asia-southeast1.firebasedatabase.app`;

    if (!admin.apps || admin.apps.length === 0) {
      console.log('[FIREBASE] Initializing new Firebase Admin instance...');
      
      // Format private key if needed
      if (privateKey) {
        privateKey = privateKey.replace(/\\n/g, '\n');
        if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
          privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`;
        }
      }

      // Load and validate Firebase credentials
      if (!projectId || !clientEmail || !privateKey) {
        throw new Error('Missing required Firebase credentials. Check environment variables.');
      }

      const app = admin.initializeApp({
        credential: admin.credential.cert({
          type: 'service_account',
          project_id: projectId,
          private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
          private_key: privateKey,
          client_email: clientEmail,
          client_id: process.env.FIREBASE_CLIENT_ID,
          auth_uri: 'https://accounts.google.com/o/oauth2/auth',
          token_uri: 'https://oauth2.googleapis.com/token',
          auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
          client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
        }),
        databaseURL
      });
      
      firebaseApp = app;
    } else {
      console.log('[FIREBASE] Using existing Firebase Admin instance...');
      firebaseApp = admin.app();
    }

    // Initialize Firestore
    const db = getFirestore(firebaseApp);
    db.settings({
      ignoreUndefinedProperties: true
    });

    // Initialize notifications
    await initializeNotifications();

    console.log('[FIREBASE] Firebase Admin initialized successfully');
    return firebaseApp;
  } catch (error) {
    console.error('[FIREBASE] Failed to initialize Firebase:', error);
    throw error;
  }
}

// Firebase service getters
export function getFirebaseAuth(): admin.auth.Auth {
  if (!firebaseApp) {
    throw new Error('Firebase Admin not initialized');
  }
  return getAuth(firebaseApp);
}

export function getFirebaseFirestore(): admin.firestore.Firestore {
  if (!firebaseApp) {
    throw new Error('Firebase Admin not initialized');
  }
  return getFirestore(firebaseApp);
}

export function getFirebaseDatabase(): admin.database.Database {
  if (!firebaseApp) {
    throw new Error('Firebase Admin not initialized');
  }
  return getDatabase(firebaseApp);
}

// Role and permission management functions
export async function getDefaultPermissions(role: keyof typeof RoleTypes): Promise<Permission[]> {
  const db = getFirebaseDatabase();
  const roleRef = db.ref(`role-definitions/${role}`);
  const snapshot = await roleRef.once('value');
  const customPermissions = snapshot.val()?.permissions;

  if (customPermissions) {
    return customPermissions;
  }

  return DefaultPermissions[role] || [];
}

export async function updateUserRole(userId: string, role: RoleTypes, customPermissions?: Permission[]) {
  try {
    const auth = getFirebaseAuth();
    const db = getFirebaseDatabase();
    const timestamp = Date.now();

    const permissions = customPermissions || await getDefaultPermissions(role);

    const roleData = {
      role,
      permissions,
      updatedAt: timestamp
    };

    await db.ref(`roles/${userId}`).set(roleData);

    await auth.setCustomUserClaims(userId, {
      role,
      permissions,
      updatedAt: timestamp
    });

    await db.ref(`role-history/${userId}`).push({
      action: 'update',
      role,
      permissions,
      timestamp,
      type: 'role_update'
    });

    return {
      success: true,
      role,
      permissions,
      updatedAt: timestamp
    };
  } catch (error) {
    console.error('[ROLE-UPDATE] Error updating user role:', error);
    throw error;
  }
}

export async function setupAdminUser() {
  try {
    const auth = getFirebaseAuth();
    const db = getFirebaseDatabase();

    const adminEmail = 'admin@groomery.in';
    const adminUid = 'MjQnuZnthzUIh2huoDpqCSMMvxe2';

    try {
      await auth.getUser(adminUid);
      console.log('[FIREBASE] Found existing admin user');
    } catch (error) {
      await auth.createUser({
        uid: adminUid,
        email: adminEmail,
        emailVerified: true,
        displayName: 'Admin User'
      });
      console.log('[FIREBASE] Created new admin user');
    }

    await db.ref(`roles/${adminUid}`).set({
      role: RoleTypes.ADMIN,
      permissions: ALL_PERMISSIONS,
      isAdmin: true,
      updatedAt: Date.now()
    });

    await auth.setCustomUserClaims(adminUid, {
      role: RoleTypes.ADMIN,
      permissions: ALL_PERMISSIONS,
      isAdmin: true,
      updatedAt: Date.now()
    });

    console.log('[FIREBASE] Admin user setup completed');
    return true;
  } catch (error) {
    console.error('[FIREBASE] Failed to setup admin user:', error);
    throw error;
  }
}

// Initialize Firebase Admin on module load
initializeFirebaseAdmin().catch(error => {
  console.error('[FIREBASE] Failed to initialize Firebase Admin:', error);
});