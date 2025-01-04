import { getFirestore } from 'firebase-admin/firestore';
import { 
  initializeFirebaseAdmin,
  getFirebaseFirestore,
  getFirebaseDatabase
} from '../firebase';
import * as admin from 'firebase-admin';

export async function initializeNotifications() {
  try {
    console.log('[INIT] Starting notifications collection initialization...');
    const app = await initializeFirebaseAdmin();
    const db = getFirebaseFirestore();
    const rtdb = getFirebaseDatabase();

    // Create notifications collection
    const notificationsRef = db.collection('notifications');

    // Create test notification to ensure collection exists
    await notificationsRef.doc('_config').set({
      initialized: true,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    // Get role definitions from Realtime Database
    const roleSnapshot = await rtdb.ref('role-definitions').once('value');
    const roleDefinitions = roleSnapshot.val();

    console.log('[INIT] Retrieved role definitions:', roleDefinitions ? 'Success' : 'Not found');

    // Set security rules for the collection
    const securityRules = {
      rules: {
        read: true,
        write: true,
        conditions: {
          read: "auth != null && (request.auth.token.permissions.includes('view_notifications') || request.auth.token.role == 'admin')",
          write: "auth != null && (request.auth.token.permissions.includes('manage_notifications') || request.auth.token.role == 'admin')",
          create: "auth != null && (request.auth.token.permissions.includes('manage_notifications') || request.auth.token.role == 'admin')",
          update: "auth != null && (request.auth.token.permissions.includes('manage_notifications') || request.auth.token.role == 'admin' || resource.data.userId == request.auth.uid)",
          delete: "auth != null && (request.auth.token.permissions.includes('manage_notifications') || request.auth.token.role == 'admin' || resource.data.userId == request.auth.uid)"
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }
    };

    // Set the security rules
    await db.collection('_security_rules').doc('notifications').set(securityRules);

    console.log('[INIT] Notifications collection initialized with security rules');

    return true;
  } catch (error) {
    console.error('[INIT] Error initializing notifications:', error);
    throw error;
  }
}