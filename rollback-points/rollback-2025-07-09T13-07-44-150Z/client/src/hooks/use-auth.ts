import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { User } from 'firebase/auth';
import { setPersistence, browserLocalPersistence } from 'firebase/auth';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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

  return { user, loading };
}