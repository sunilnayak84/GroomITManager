/**
 * Script to manually update Cheryl's role to Manager
 * This bypasses the API and directly updates Firestore and Firebase Auth
 */

import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin
function initializeFirebaseAdmin() {
  try {
    if (admin.apps.length === 0) {
      // Check if we have service account from environment
      const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      
      if (serviceAccountKey) {
        const serviceAccount = JSON.parse(serviceAccountKey);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: serviceAccount.project_id
        });
        console.log('Firebase Admin initialized with service account');
      } else {
        throw new Error('No Firebase service account found in environment');
      }
    }
    return admin.app();
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error);
    throw error;
  }
}

async function updateCherylRole() {
  try {
    console.log('Initializing Firebase Admin...');
    const app = initializeFirebaseAdmin();
    
    const db = getFirestore();
    const auth = admin.auth();
    
    // Find Cheryl's user ID by email
    console.log('Finding Cheryl\'s user record...');
    const userRecord = await auth.getUserByEmail('cheryl@groomery.in');
    const userId = userRecord.uid;
    
    console.log(`Found Cheryl's user ID: ${userId}`);
    
    // Define manager role and permissions
    const managerRole = 'manager';
    const managerPermissions = [
      'appointments.read',
      'appointments.create', 
      'appointments.update',
      'customers.read',
      'customers.create',
      'customers.update',
      'pets.read',
      'pets.create', 
      'pets.update',
      'services.read',
      'billing.read',
      'billing.create',
      'billing.update',
      'staff.read',
      'inventory.read',
      'reports.read'
    ];
    
    // Update Firestore user document
    console.log('Updating user document in Firestore...');
    await db.collection('users').doc(userId).set({
      role: managerRole,
      permissions: managerPermissions,
      updatedAt: Date.now(),
      email: 'cheryl@groomery.in',
      name: 'Cheryl',
      displayName: 'Cheryl'
    }, { merge: true });
    
    // Update Firebase Auth custom claims
    console.log('Setting custom claims in Firebase Auth...');
    await auth.setCustomUserClaims(userId, {
      role: managerRole,
      permissions: managerPermissions
    });
    
    // Create role history entry
    console.log('Creating role history entry...');
    await db.collection('role-history').add({
      userId: userId,
      role: managerRole,
      permissions: managerPermissions,
      actorId: 'manual-script',
      timestamp: Date.now(),
      action: 'role_update',
      previousRole: 'admin',
      reason: 'Manual role update via script'
    });
    
    console.log('✅ Successfully updated Cheryl\'s role to Manager!');
    console.log('She will need to refresh her browser or log out and back in to see the changes.');
    
  } catch (error) {
    console.error('❌ Error updating Cheryl\'s role:', error);
    throw error;
  }
}

// Run the script
updateCherylRole()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });