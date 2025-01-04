import * as admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getDatabase } from 'firebase-admin/database';
import { initializeNotifications } from './scripts/initialize-notifications';

let firebaseApp: admin.app.App;

const MAX_INIT_RETRIES = 3;
const INIT_RETRY_DELAY = 1000; // 1 second

export async function getFirebaseAdmin(): Promise<admin.app.App> {
  if (firebaseApp) {
    return firebaseApp;
  }

  console.log('[FIREBASE] Checking Firebase environment variables...');

  let privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (privateKey) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  const databaseURL = process.env.FIREBASE_DATABASE_URL ||
    `https://${process.env.FIREBASE_PROJECT_ID}-default-rtdb.asia-southeast1.firebasedatabase.app`;

  if (!privateKey || !process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL) {
    throw new Error('Missing Firebase credentials. Check environment variables.');
  }

  try {
    if (admin.apps.length === 0) {
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey
        }),
        databaseURL: databaseURL
      });
    } else {
      firebaseApp = admin.app();
    }

    // Initialize Firestore with persistence
    const db = getFirestore(firebaseApp);
    db.settings({
      ignoreUndefinedProperties: true
    });

    // Initialize collections and security rules
    await initializeNotifications();

    console.log('[FIREBASE] Firebase initialized successfully');
    return firebaseApp;
  } catch (error) {
    console.error('[FIREBASE] Failed to initialize Firebase:', error);
    throw error;
  }
}

export const auth = getAuth(await getFirebaseAdmin());
export const db = getFirestore(await getFirebaseAdmin());
export const rtdb = getDatabase(await getFirebaseAdmin());

export enum RoleTypes {
  ADMIN = 'admin',
  CUSTOMER = 'customer',
  STAFF = 'staff',
  RECEPTIONIST = 'receptionist'
}

// Define all available permissions
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

// Helper function to validate permissions
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

// Add the missing getDefaultPermissions function
export async function getDefaultPermissions(role: keyof typeof RoleTypes): Promise<string[]> {
  // First check if there are custom role permissions in the database
  const db = admin.database();
  const roleRef = db.ref(`role-definitions/${role}`);
  const snapshot = await roleRef.once('value');
  const customPermissions = snapshot.val()?.permissions;

  if (customPermissions) {
    return customPermissions;
  }

  // If no custom permissions found, return the default ones
  return DefaultPermissions[role] || [];
}

// Export InitialRoleConfigs
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