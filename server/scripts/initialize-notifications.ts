
import { getFirebaseApp } from '../firebase';
import { getFirestore } from 'firebase-admin/firestore';

async function initializeNotifications() {
  const db = getFirestore(getFirebaseApp());
  
  try {
    // Create the notifications collection with an initial document
    const notificationsRef = db.collection('notifications');
    await notificationsRef.add({
      userId: 'system',
      type: 'system',
      title: 'System Initialized',
      message: 'Notification system is now active',
      isRead: false,
      createdAt: new Date().toISOString(),
      updatedAt: null
    });
    
    console.log('Notifications collection initialized successfully');
  } catch (error) {
    console.error('Error initializing notifications:', error);
  }
}

initializeNotifications().catch(console.error);
