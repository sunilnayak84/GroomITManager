
import { getFirestore } from 'firebase-admin/firestore';
import { getFirebaseAdmin } from '../firebase';

export async function initializeNotifications() {
  const app = await getFirebaseAdmin();
  const db = getFirestore(app);
  
  try {
    // Set security rules for collections
    const collections = ['appointments', 'pets', 'services', 'workingHours', 'notifications'];
    
    for (const collectionName of collections) {
      await db.collection(collectionName).doc('_security_rules').set({
        rules: {
          read: true,
          write: true,
          conditions: {
            read: "auth != null",
            write: "auth != null"
          }
        },
        updatedAt: new Date().toISOString()
      });
    }
    
    console.log('Security rules initialized successfully');
  } catch (error) {
    console.error('Error initializing security rules:', error);
    throw error;
  }
}
