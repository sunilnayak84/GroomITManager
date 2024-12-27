
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

export async function initializeFirebaseAdmin() {
  if (!admin.apps.length) {
    await admin.initializeApp();
  }
  
  const firestore = getFirestore();
  
  // Migrate role definitions to Firestore
  const roleCollection = firestore.collection('roles');
  const roleDefCollection = firestore.collection('role-definitions');

  return { firestore, admin };
}
