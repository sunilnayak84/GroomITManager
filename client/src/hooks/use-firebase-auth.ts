
import { useCallback } from 'react';
import { auth } from '@/lib/firebase';

export function useFirebaseAuth() {
  const getIdToken = useCallback(async (forceRefresh = false) => {
    if (!auth.currentUser) {
      return null;
    }
    
    try {
      return await auth.currentUser.getIdToken(forceRefresh);
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }, []);

  return { getIdToken };
}
