
import * as admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getDatabase } from 'firebase-admin/database';

let app: admin.app.App;

export async function getFirebaseAdmin() {
  if (!app) {
    app = admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
      projectId: process.env.FIREBASE_PROJECT_ID
    });
    
    // Initialize Firestore settings
    const db = getFirestore(app);
    db.settings({
      ignoreUndefinedProperties: true
    });
  }
  return app;
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);

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
