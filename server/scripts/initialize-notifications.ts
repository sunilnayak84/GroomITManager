import { getFirebaseAdmin } from '../firebase';
import admin from 'firebase-admin';

async function initializeNotifications() {
  try {
    console.log('[INIT] Starting notifications collection initialization...');
    const app = await getFirebaseAdmin();
    const db = admin.firestore();

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
      }
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