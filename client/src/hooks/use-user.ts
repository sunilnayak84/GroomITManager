import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { User, InsertUser } from "@db/schema";
import { auth } from '../lib/firebase';
import { 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User as FirebaseUser
} from 'firebase/auth';

export type UserRole = 'admin' | 'manager' | 'staff' | 'receptionist';

// Define permissions for each role
export const RolePermissions = {
  admin: ['all'],
  manager: [
    'manage_appointments',
    'manage_services',
    'manage_inventory',
    'view_reports',
    'manage_staff_schedules',
    'manage_customers',
    'view_analytics',
    'manage_service_packages',
    'manage_notifications',
    'manage_working_hours',
    'view_all_branches',
    'manage_pets',
    'manage_consumables',
    'view_staff'
  ],
  staff: [
    'manage_appointments',
    'view_customers',
    'view_inventory',
    'manage_own_schedule',
    'view_pets'
  ],
  receptionist: [
    'view_appointments',
    'create_appointments',
    'view_customers',
    'create_customers',
    'view_pets'
  ]
} as const;

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