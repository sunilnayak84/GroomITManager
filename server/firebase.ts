
import * as admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getDatabase } from 'firebase-admin/database';

// Initialize Firebase Admin with service account
const app = admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID!,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')!
  }),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);

// Configure Firestore settings
db.settings({
  ignoreUndefinedProperties: true
});

export enum RoleTypes {
  ADMIN = 'admin',
  CUSTOMER = 'customer',
  STAFF = 'staff',
  RECEPTIONIST = 'receptionist'
}

export const DefaultPermissions = {
  [RoleTypes.ADMIN]: ['*'],
  [RoleTypes.CUSTOMER]: ['read_own', 'write_own'],
  [RoleTypes.STAFF]: ['read_appointments', 'write_appointments'],
  [RoleTypes.RECEPTIONIST]: ['read_customers', 'write_customers']
};
