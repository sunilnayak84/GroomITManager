import { useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { toast } from '@/components/ui/use-toast';

const db = getFirestore();

async function syncUserData(userId: string, userData: {
  email: string | null;
  displayName: string | null;
  lastSignInTime: string | null;
}) {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      // New user - set default role and data
      await setDoc(userRef, {
        email: userData.email,
        displayName: userData.displayName,
        lastSignInTime: userData.lastSignInTime,
        role: 'user', // Default role
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } else {
      // Existing user - update only auth-related fields
      await setDoc(userRef, {
        email: userData.email,
        displayName: userData.displayName,
        lastSignInTime: userData.lastSignInTime,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }
  } catch (error) {
    console.error('[AUTH-SYNC] Error syncing user data:', error);
    toast({
      title: 'Sync Error',
      description: 'Failed to sync user data. Please try again.',
      variant: 'destructive'
    });
  }
}

export function useAuthSync() {
  useEffect(() => {
    const auth = getAuth();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        console.log('[AUTH-SYNC] User signed in, syncing data...');
        await syncUserData(user.uid, {
          email: user.email,
          displayName: user.displayName,
          lastSignInTime: user.metadata.lastSignInTime || null
        });
      }
    });

    return () => unsubscribe();
  }, []);
}