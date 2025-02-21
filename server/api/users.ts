import express from 'express';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const router = express.Router();
const db = getFirestore();
const auth = getAuth();

// Get all users with their Firebase Auth metadata
router.get('/api/users', async (req, res) => {
  try {
    // Get all users from Firebase Auth
    const { users: authUsers } = await auth.listUsers();

    // Get all users from Firestore
    const usersSnapshot = await db.collection('users').get();
    const firestoreUsers = new Map(
      usersSnapshot.docs.map(doc => [
        doc.id,
        { uid: doc.id, ...doc.data() }
      ])
    );

    // Merge Firestore and Auth data
    const mergedUsers = authUsers.map(authUser => {
      const firestoreUser = firestoreUsers.get(authUser.uid) || {
        role: 'user',
        disabled: false
      };

      return {
        uid: authUser.uid,
        email: authUser.email,
        displayName: authUser.displayName || authUser.email?.split('@')[0] || 'N/A',
        role: firestoreUser.role || 'user',
        lastSignInTime: authUser.metadata.lastSignInTime || 'Never',
        createdAt: authUser.metadata.creationTime,
        disabled: authUser.disabled || firestoreUser.disabled || false
      };
    });

    console.log('[API] Successfully merged user data:', mergedUsers);
    res.json(mergedUsers);
  } catch (error) {
    console.error('[API] Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

export default router;