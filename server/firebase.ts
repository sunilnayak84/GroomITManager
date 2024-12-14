
import * as admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

let firebaseAdmin: admin.app.App | null = null;

export function initializeFirebaseAdmin() {
  if (!firebaseAdmin) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

    if (!projectId || !privateKey || !clientEmail) {
      throw new Error('Missing Firebase Admin credentials');
    }

    firebaseAdmin = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        privateKey,
        clientEmail,
      }),
    });
  }
  return firebaseAdmin;
}

export function getFirebaseAdmin() {
  if (!firebaseAdmin) {
    initializeFirebaseAdmin();
  }
  return firebaseAdmin;
}

export function getFirebaseAuth() {
  return getAuth(getFirebaseAdmin());
}

export function getFirebaseFirestore() {
  return getFirestore(getFirebaseAdmin());
}
