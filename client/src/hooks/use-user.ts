import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { User, InsertUser } from "@db/schema";
import { auth } from '../lib/firebase';
import { 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User as FirebaseUser
} from 'firebase/auth';

type UserRole = 'admin' | 'staff' | 'receptionist';

type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  permissions?: string[];
  branchId?: number;
}

async function loginWithFirebase(credentials: { email: string; password: string }): Promise<AuthUser> {
  try {
    const { user } = await signInWithEmailAndPassword(
      auth,
      credentials.email,
      credentials.password
    );
    
    // Get custom claims from Firebase user
    const tokenResult = await user.getIdTokenResult();
    const role = (tokenResult.claims.role as UserRole) || 'staff';
    const permissions = tokenResult.claims.permissions as string[] || [];

    return {
      id: user.uid,
      email: user.email!,
      name: user.displayName || user.email!,
      role,
      permissions,
      branchId: tokenResult.claims.branchId as number
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
            // Get custom claims from Firebase user
            user.getIdTokenResult().then(tokenResult => {
              const role = (tokenResult.claims.role as UserRole) || 'staff';
              const permissions = tokenResult.claims.permissions as string[] || [];
              resolve({
                id: user.uid,
                email: user.email!,
                name: user.displayName || user.email!,
                role,
                permissions,
                branchId: tokenResult.claims.branchId as number
              });
            })
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