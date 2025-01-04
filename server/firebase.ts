
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

try {
  const privateKey = process.env.REPLIT_FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  
  if (!process.env.REPLIT_FIREBASE_PROJECT_ID) {
    throw new Error('Missing REPLIT_FIREBASE_PROJECT_ID');
  }
  if (!process.env.REPLIT_FIREBASE_CLIENT_EMAIL) {
    throw new Error('Missing REPLIT_FIREBASE_CLIENT_EMAIL');
  }
  if (!privateKey) {
    throw new Error('Missing REPLIT_FIREBASE_PRIVATE_KEY');
  }

  // Initialize Firebase Admin only if not already initialized
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.REPLIT_FIREBASE_PROJECT_ID,
        clientEmail: process.env.REPLIT_FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey
      })
    });
  }
} catch (error) {
  console.error('Firebase Admin initialization error:', error);
  throw error;
}

export function getFirebaseApp() {
  return admin.app();
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
