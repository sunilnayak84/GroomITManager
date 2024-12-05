import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { User, InsertUser } from "@db/schema";
import { auth } from '../lib/firebase';
import { 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User as FirebaseUser
} from 'firebase/auth';

type AuthUser = {
  id: string;
  email: string;
  role: string;
  name: string;
}

async function loginWithFirebase(credentials: InsertUser): Promise<AuthUser> {
  try {
    const { user } = await signInWithEmailAndPassword(
      auth,
      credentials.username,
      credentials.password
    );
    
    return {
      id: user.uid,
      email: user.email!,
      name: user.displayName || user.email!,
      role: 'staff' // You might want to store this in Firebase custom claims
    };
  } catch (error: any) {
    throw new Error(error.message);
  }
}

function useFirebaseUser() {
  return useQuery({
    queryKey: ['user'],
    queryFn: () => {
      return new Promise<AuthUser | null>((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          unsubscribe();
          if (user) {
            resolve({
              id: user.uid,
              email: user.email!,
              name: user.displayName || user.email!,
              role: 'staff'
            });
          } else {
            resolve(null);
          }
        });
      });
    },
  });
}

export function useUser() {
  const queryClient = useQueryClient();
  const { data: user, error, isLoading } = useFirebaseUser();

  const loginMutation = useMutation({
    mutationFn: loginWithFirebase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => signOut(auth),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });

  return {
    user,
    isLoading,
    error,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
  };
}
