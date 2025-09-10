import { initializeFirebaseAdmin, RoleTypes, DefaultPermissions } from '../firebase.js';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

async function setupAdminInFirestore() {
  try {
    console.log('[ADMIN SETUP] Starting admin setup in Firestore...');
    
    // Initialize Firebase Admin
    const app = await initializeFirebaseAdmin();
    if (!app) {
      throw new Error('Failed to initialize Firebase Admin');
    }

    const db = getFirestore(app);
    const auth = getAuth(app);

    // Find user by email
    const adminEmail = 'cheryl@groomery.in';
    console.log(`[ADMIN SETUP] Looking for user: ${adminEmail}`);
    
    const userRecord = await auth.getUserByEmail(adminEmail);
    console.log(`[ADMIN SETUP] Found user: ${userRecord.uid}`);

    // Set admin role in Firestore
    const userRef = db.collection('users').doc(userRecord.uid);
    await userRef.set({
      id: userRecord.uid,
      email: userRecord.email,
      name: userRecord.displayName || userRecord.email,
      displayName: userRecord.displayName || userRecord.email?.split('@')[0] || 'Admin User',
      role: RoleTypes.admin,
      permissions: DefaultPermissions.admin,
      createdAt: Date.now(),
      lastUpdated: Date.now(),
      isAdmin: true
    }, { merge: true });

    console.log('[ADMIN SETUP] User document updated in Firestore');

    // Set custom claims in Firebase Auth
    await auth.setCustomUserClaims(userRecord.uid, {
      role: RoleTypes.admin,
      permissions: DefaultPermissions.admin,
      isAdmin: true
    });

    console.log('[ADMIN SETUP] Custom claims set in Firebase Auth');

    // Add to role history
    await db.collection('role-history').add({
      userId: userRecord.uid,
      role: RoleTypes.admin,
      permissions: DefaultPermissions.admin,
      actorId: 'system',
      timestamp: Date.now(),
      action: 'admin_setup'
    });

    console.log('[ADMIN SETUP] Role history entry created');

    // Verify the setup
    const userDoc = await userRef.get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      console.log('[ADMIN SETUP] Verification - User data:', userData);
    }

    console.log('[ADMIN SETUP] ✅ Admin setup completed successfully');
    return true;

  } catch (error) {
    console.error('[ADMIN SETUP] ❌ Error setting up admin:', error);
    throw error;
  }
}

// Run the setup
setupAdminInFirestore()
  .then(() => {
    console.log('✅ Admin setup completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Admin setup failed:', error);
    process.exit(1);
  });