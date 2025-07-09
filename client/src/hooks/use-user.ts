import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { auth } from '../lib/firebase';
import { 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User as FirebaseUser
} from 'firebase/auth';

export type UserRole = 'admin' | 'manager' | 'staff' | 'receptionist';

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
    'view_staff',
    'manage_branch_settings',
    'manage_service_pricing',
    'view_financial_reports',
    'manage_marketing_campaigns',
    'manage_inventory',
    'manage_services',
    'manage_appointments',
    'manage_working_hours'
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

    // Get role from ID token first
    let idTokenResult = await user.getIdTokenResult();
    let role = idTokenResult.claims.role as UserRole;

    // If role is not found in custom claims, force token refresh to get updated claims
    if (!role) {
      console.log('Role not found in custom claims, forcing token refresh...');
      await user.getIdToken(true); // Force refresh
      idTokenResult = await user.getIdTokenResult();
      role = idTokenResult.claims.role as UserRole;
    }

    // If still no role, try to sync with backend
    if (!role) {
      console.log('Role still not found, attempting backend sync...');
      try {
        const token = await user.getIdToken();
        const response = await fetch('/api/auth/sync-role', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.role) {
            // Force another token refresh after backend sync
            await user.getIdToken(true);
            idTokenResult = await user.getIdTokenResult();
            role = idTokenResult.claims.role as UserRole || data.role;
          }
        }
      } catch (syncError) {
        console.error('Role sync error:', syncError);
      }
    }

    // If we still don't have a role, throw an error
    if (!role) {
      throw new Error('User role not found. Please contact administrator.');
    }

    return {
      id: user.uid,
      email: user.email!,
      name: user.displayName || user.email!,
      role: role,
      permissions: idTokenResult.claims.permissions as string[] || RolePermissions[role] || [],
      branchId: idTokenResult.claims.branchId as number | undefined
    };

  } catch (error: any) {
    console.error('Login error:', error);
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
      throw new Error('Invalid email or password');
    }
    throw error;
  }
}

function useFirebaseUser() {
  return useQuery({
    queryKey: ['user'],
    queryFn: () => {
      return new Promise<AuthUser | null>((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
          unsubscribe();
          if (user) {
            try {
              // Force token refresh to get latest custom claims
              console.log('[USER] Getting fresh token to ensure latest role data...');
              await user.getIdToken(true); // Force refresh
              const tokenResult = await user.getIdTokenResult();
              
              const role = (tokenResult.claims.role as UserRole) || 'staff';
              console.log('[USER] Current role from token:', role);
              
              resolve({
                id: user.uid,
                email: user.email!,
                name: user.displayName || user.email!,
                role,
                permissions: tokenResult.claims.permissions as string[],
                branchId: tokenResult.claims.branchId as number
              });
            } catch (error) {
              console.error('[USER] Error getting token result:', error);
              // Fallback without forcing refresh
              const tokenResult = await user.getIdTokenResult();
              const role = (tokenResult.claims.role as UserRole) || 'staff';
              resolve({
                id: user.uid,
                email: user.email!,
                name: user.displayName || user.email!,
                role,
                permissions: tokenResult.claims.permissions as string[],
                branchId: tokenResult.claims.branchId as number
              });
            }
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
    onSuccess: (userData) => {
      queryClient.setQueryData(['user'], userData);
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