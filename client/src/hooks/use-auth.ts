import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { User } from 'firebase/auth';
import { setPersistence, browserLocalPersistence } from 'firebase/auth';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshToken = async () => {
    if (auth.currentUser) {
      try {
        console.log('[AUTH] Refreshing authentication token...');
        await auth.currentUser.getIdToken(true); // Force refresh
        console.log('[AUTH] Token refreshed successfully');
        // Trigger a re-authentication check
        const refreshedUser = auth.currentUser;
        setUser({ ...refreshedUser });
        return true;
      } catch (error) {
        console.error('[AUTH] Error refreshing token:', error);
        return false;
      }
    }
    return false;
  };

  useEffect(() => {
    // Set persistence to LOCAL to ensure token persists across page refreshes
    setPersistence(auth, browserLocalPersistence).catch(error => {
      console.error("Auth persistence error:", error);
    });

    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, loading, refreshToken };
}