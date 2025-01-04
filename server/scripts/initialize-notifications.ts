
import { getFirebaseApp } from '../firebase';
import { getFirestore } from 'firebase-admin/firestore';

async function initializeNotifications() {
  const db = getFirestore(getFirebaseApp());
  
  try {
    await db.collection('notifications').add({
      userId: 'admin',
      type: 'system',
      title: 'System Initialized',
      message: 'Notification system is now active',
      isRead: false,
      createdAt: new Date().toISOString(),
      updatedAt: null
    });
    
    console.log('Notifications collection initialized');
  } catch (error) {
    console.error('Error initializing notifications:', error);
  }
}

initializeNotifications();
