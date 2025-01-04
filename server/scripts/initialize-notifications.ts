import { getFirebaseAdmin } from '../firebase';
import admin from 'firebase-admin';

async function initializeNotifications() {
  try {
    console.log('[INIT] Starting notifications collection initialization...');
    const app = await getFirebaseAdmin();
    const db = admin.firestore();
    const rtdb = admin.database();

    // Create notifications collection
    const notificationsRef = db.collection('notifications');

    // Create schema document
    await notificationsRef.doc('_schema').set({
      version: '1.0',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      fields: {
        userId: 'string',
        type: 'string',
        title: 'string',
        message: 'string',
        appointmentId: 'string?',
        isRead: 'boolean',
        createdAt: 'timestamp',
        priority: 'string',
      },
      schemaVersion: '1.0'
    });

    // Create indexes
    await notificationsRef.doc('_indexes').set({
      byUser: ['userId', 'createdAt'],
      byType: ['type', 'createdAt'],
      byAppointment: ['appointmentId', 'createdAt']
    });

    // Create test notification
    await notificationsRef.add({
      userId: 'system',
      type: 'system',
      title: 'System Initialized',
      message: 'Notifications system has been initialized successfully',
      isRead: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      priority: 'low'
    });

    // Get role definitions from Realtime Database
    const roleSnapshot = await rtdb.ref('role-definitions').once('value');
    const roleDefinitions = roleSnapshot.val();

    console.log('[INIT] Retrieved role definitions:', roleDefinitions ? 'Success' : 'Not found');

    // Set security rules for the collection
    // Set notifications collection rules
    await db.collection('notifications').doc('_security_rules').set({
      rules: {
        read: "auth != null",
        write: "auth != null",
        list: "auth != null",
        delete: "auth != null",
        conditions: {
          read: "auth != null && (resource.data.userId == auth.uid || request.auth.token.role == 'admin')",
          write: "auth != null && (resource.data.userId == auth.uid || request.auth.token.role == 'admin')",
          list: "auth != null",
          create: "auth != null",
          update: "auth != null && (resource.data.userId == auth.uid || request.auth.token.role == 'admin')",
          delete: "auth != null && (resource.data.userId == auth.uid || request.auth.token.role == 'admin')"
        }
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('[INIT] Notifications collection initialized successfully');
    return true;
  } catch (error) {
    console.error('[INIT] Error initializing notifications:', error);
    throw error;
  }
}

// Execute if this is the main module
if (import.meta.url === new URL(import.meta.url).href) {
  initializeNotifications()
    .then(() => {
      console.log('[INIT] Notifications initialization completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('[INIT] Fatal error during initialization:', error);
      process.exit(1);
    });
}

export default initializeNotifications;