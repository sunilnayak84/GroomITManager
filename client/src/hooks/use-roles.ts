import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAuth, User as FirebaseUser } from 'firebase/auth';
import { getFirestore, collection, getDocs, doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { toast } from '@/components/ui/use-toast';

interface Role {
  id: string;
  name: string;
  permissions: string[];
  description?: string;
}

interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: string;
  disabled?: boolean;
  lastSignInTime?: string;
  createdAt?: string;
}

const db = getFirestore();
const auth = getAuth();

async function fetchRoles(): Promise<Role[]> {
  try {
    console.log('[ROLES] Fetching roles from backend API...');
    
    const response = await fetch('/api/auth/roles', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await auth.currentUser?.getIdToken()}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch roles from backend');
    }

    const roles = await response.json();
    console.log('[ROLES] Fetched roles:', roles);
    return roles;
  } catch (error) {
    console.error('[ROLES] Error fetching roles:', error);
    throw error;
  }
}

async function fetchUsers(): Promise<User[]> {
  try {
    console.log('[USERS] Fetching users from backend API...');
    
    const response = await fetch('/api/auth/users', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await auth.currentUser?.getIdToken()}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch users from backend');
    }

    const users = await response.json();
    console.log('[USERS] Fetched users:', users);
    return users;
  } catch (error) {
    console.error('[USERS] Error fetching users:', error);
    throw error;
  }
}

async function createRole(data: { name: string; permissions: string[] }): Promise<Role> {
  try {
    console.log('[ROLES] Creating role:', data);
    const roleRef = doc(db, 'role-definitions', data.name);
    await setDoc(roleRef, {
      ...data,
      createdAt: new Date().toISOString()
    });
    const role = {
      id: data.name,
      ...data
    };
    console.log('[ROLES] Created role:', role);
    return role;
  } catch (error) {
    console.error('[ROLES] Error creating role:', error);
    throw error;
  }
}

async function updateRole({ roleId, ...data }: { roleId: string; name: string; permissions: string[] }): Promise<Role> {
  try {
    console.log('[ROLES] Updating role:', { roleId, ...data });
    const roleRef = doc(db, 'role-definitions', roleId);
    await updateDoc(roleRef, {
      ...data,
      updatedAt: new Date().toISOString()
    });
    const role = {
      id: roleId,
      ...data
    };
    console.log('[ROLES] Updated role:', role);
    return role;
  } catch (error) {
    console.error('[ROLES] Error updating role:', error);
    throw error;
  }
}

async function updateUserRole(params: { userId: string; role: string }): Promise<void> {
  try {
    console.log('[USERS] Updating user role via backend API:', params);
    
    const response = await fetch('/api/auth/update-user-role', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await auth.currentUser?.getIdToken()}`
      },
      body: JSON.stringify({
        userId: params.userId,
        role: params.role
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update user role');
    }

    console.log('[USERS] Updated user role successfully via backend');
  } catch (error) {
    console.error('[USERS] Error updating user role:', error);
    throw error;
  }
}

async function createUser(params: { 
  email: string; 
  password?: string; 
  displayName?: string; 
  role: string; 
  phoneNumber?: string; 
}): Promise<User> {
  try {
    console.log('[USERS] Creating user via backend API:', { email: params.email, role: params.role });
    
    const response = await fetch('/api/auth/create-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await auth.currentUser?.getIdToken()}`
      },
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create user');
    }

    const result = await response.json();
    console.log('[USERS] Created user successfully via backend:', result.user);
    return result.user;
  } catch (error) {
    console.error('[USERS] Error creating user:', error);
    throw error;
  }
}

export function useRoles() {
  const queryClient = useQueryClient();

  const { 
    data: roles, 
    isLoading: isLoadingRoles, 
    error: rolesError 
  } = useQuery({
    queryKey: ['roles'],
    queryFn: fetchRoles,
    retry: 1
  });

  const { 
    data: users, 
    isLoading: isLoadingUsers, 
    error: usersError 
  } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
    retry: 1
  });

  const createRoleMutation = useMutation({
    mutationFn: createRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast({
        title: 'Success',
        description: 'Role created successfully'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const updateRoleMutation = useMutation({
    mutationFn: updateRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast({
        title: 'Success',
        description: 'Role updated successfully'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: updateUserRole,
    onSuccess: async (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      
      // If the current user's role was updated, force token refresh
      const currentUser = auth.currentUser;
      if (currentUser && currentUser.uid === variables.userId) {
        try {
          // Force token refresh to get updated custom claims
          await currentUser.getIdToken(true);
          // Refresh user data in the cache
          queryClient.invalidateQueries({ queryKey: ['user'] });
          
          toast({
            title: 'Success',
            description: 'Your role has been updated. Please refresh the page to see the changes.'
          });
        } catch (error) {
          console.error('Failed to refresh token:', error);
          toast({
            title: 'Role Updated',
            description: 'Role updated successfully. Please log out and log back in to see the changes.',
            variant: 'default'
          });
        }
      } else {
        toast({
          title: 'Success',
          description: 'User role updated successfully'
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const createUserMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: "Success",
        description: "User created successfully"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  return {
    roles: roles || [],
    isLoadingRoles,
    users: users || [],
    isLoadingUsers,
    createRole: createRoleMutation.mutate,
    updateRole: updateRoleMutation.mutate,
    isCreating: createRoleMutation.isPending,
    isUpdating: updateRoleMutation.isPending,
    updateUserRole: updateUserRoleMutation.mutate,
    isUpdatingUserRole: updateUserRoleMutation.isPending,
    createUser: createUserMutation.mutate,
    isCreatingUser: createUserMutation.isPending,
    error: rolesError || usersError
  };
}