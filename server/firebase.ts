
import * as admin from 'firebase-admin';
import { RoleTypes, Permission } from './types';

const DefaultPermissions: Record<RoleTypes, Permission[]> = {
  admin: ['all'],
  manager: [
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
  staff: [
    'view_appointments',
    'manage_own_schedule',
    'view_customers'
  ],
  customer: [
    'view_own_appointments',
    'create_appointments',
    'view_services'
  ]
};

let firebaseApp: admin.app.App | null = null;

export function initializeFirebase() {
  if (!firebaseApp) {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.applicationDefault()
    });
  }
  return firebaseApp;
}

export function getFirebaseApp() {
  if (!firebaseApp) {
    return initializeFirebase();
  }
  return firebaseApp;
}

export async function setUserRole(uid: string, role: RoleTypes) {
  const auth = getFirebaseApp().auth();
  await auth.setCustomUserClaims(uid, {
    role,
    permissions: DefaultPermissions[role]
  });
}

export async function verifyToken(token: string) {
  try {
    const auth = getFirebaseApp().auth();
    return await auth.verifyIdToken(token);
  } catch (error) {
    console.error('Error verifying token:', error);
    throw error;
  }
}

export { DefaultPermissions };
