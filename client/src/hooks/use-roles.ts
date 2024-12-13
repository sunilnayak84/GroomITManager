import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { getAuth } from 'firebase/auth';
import { toast } from '@/components/ui/use-toast';
import type { UserRole } from './use-user';

interface Role {
  name: string;
  permissions: string[];
  isSystem?: boolean;
  createdAt?: number;
  updatedAt?: number;
}

interface FirebaseUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: string;
  permissions: string[];
}

interface FirebaseUsersResponse {
  users: FirebaseUser[];
  pageToken?: string | null;
}

async function fetchRoles(): Promise<Role[]> {
  const auth = getAuth();
  if (!auth.currentUser) {
    console.warn('User not authenticated when fetching roles');
    return [];
  }
  
  try {
    // Force token refresh
    const token = await auth.currentUser.getIdToken(true);
    console.log('[ROLES] Fetching roles...');
    
    const response = await fetch('/api/roles', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (response.status === 401) {
      // Try one more time with a fresh token
      const newToken = await auth.currentUser.getIdToken(true);
      const retryResponse = await fetch('/api/roles', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${newToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!retryResponse.ok) {
        throw new Error(`Failed to fetch roles after token refresh: ${await retryResponse.text()}`);
      }
      return retryResponse.json();
    }
    
    if (!response.ok) {
      throw new Error(`Failed to fetch roles: ${await response.text()}`);
    }
    
    const data = await response.json();
    console.log('[ROLES] Successfully fetched roles:', data);
    return data;
  } catch (error) {
    console.error('[ROLES] Error in fetchRoles:', error);
    throw error;
  }
}

async function fetchFirebaseUsers(params: { pageParam?: string | null }): Promise<FirebaseUsersResponse> {
  const auth = getAuth();
  if (!auth.currentUser) {
    console.warn('[FIREBASE-USERS] User not authenticated');
    return { users: [], pageToken: null };
  }
  
  try {
    const token = await auth.currentUser.getIdToken(true);
    
    const searchParams = new URLSearchParams();
    if (params.pageParam) {
      searchParams.append('pageToken', params.pageParam);
    }
    
    console.log('[FIREBASE-USERS] Fetching users...');
    
    const makeRequest = async (authToken: string) => {
      const response = await fetch('/api/firebase-users?' + searchParams.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${await response.text()}`);
      }
      
      return response.json();
    };
    
    try {
      return await makeRequest(token);
    } catch (error) {
      if (error.message.includes('401')) {
        console.log('[FIREBASE-USERS] Token expired, refreshing...');
        const newToken = await auth.currentUser.getIdToken(true);
        return await makeRequest(newToken);
      }
      throw error;
    }
  } catch (error) {
    console.error('[FIREBASE-USERS] Error:', error);
    throw error;
  }
}

async function updateUserRole(userId: string, role: string): Promise<void> {
  const auth = getAuth();
  if (!auth.currentUser) {
    throw new Error('User not authenticated');
  }

  const token = await auth.currentUser.getIdToken(true);
  const response = await fetch(`/api/users/${userId}/role`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ role }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update user role');
  }
}

async function createRole(role: Role): Promise<Role> {
  const auth = getAuth();
  if (!auth.currentUser) {
    throw new Error('User not authenticated');
  }

  try {
    const token = await auth.currentUser.getIdToken(true);
    console.log('[ROLES] Creating new role:', role);
    
    const response = await fetch('/api/roles', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(role),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create role');
    }

    return response.json();
  } catch (error) {
    console.error('[ROLES] Error creating role:', error);
    throw error;
  }
}

async function updateRole(role: Role): Promise<Role> {
  const auth = getAuth();
  if (!auth.currentUser) {
    throw new Error('User not authenticated');
  }

  const token = await auth.currentUser.getIdToken(true);
  console.log('[ROLES] Updating role:', role);

  const response = await fetch(`/api/roles/${role.name}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      permissions: role.permissions
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update role');
  }

  return response.json();
}

export function useRoles() {
  const queryClient = useQueryClient();

  const { data: roles, isLoading: isLoadingRoles } = useQuery({
    queryKey: ['roles'],
    queryFn: fetchRoles,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    refetchOnWindowFocus: true,
  });

  const { data: usersData, isLoading: isLoadingUsers, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ['firebase-users'],
    queryFn: ({ pageParam }) => fetchFirebaseUsers({ pageParam }),
    getNextPageParam: (lastPage: FirebaseUsersResponse) => lastPage.pageToken,
    initialPageParam: null as string | null,
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      await updateUserRole(userId, role);
      // Force token refresh after role update
      const auth = getAuth();
      if (auth.currentUser && auth.currentUser.uid === userId) {
        await auth.currentUser.getIdToken(true);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firebase-users'] });
      toast({
        title: 'Success',
        description: 'User role updated successfully. Please log out and log back in to see the changes.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const createRoleMutation = useMutation({
    mutationFn: createRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast({
        title: 'Success',
        description: 'Role created successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async (role: Role) => {
      console.log('[ROLES] Updating role:', role);
      const result = await updateRole(role);
      console.log('[ROLES] Update result:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('[ROLES] Role updated successfully:', data);
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast({
        title: 'Success',
        description: 'Role updated successfully',
      });
    },
    onError: (error: Error) => {
      console.error('[ROLES] Error updating role:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    roles,
    isLoadingRoles,
    createRole: createRoleMutation.mutate,
    updateRole: updateRoleMutation.mutate,
    isCreating: createRoleMutation.isPending,
    isUpdating: updateRoleMutation.isPending,
    users: usersData?.pages.flatMap(page => page.users) ?? [],
    isLoadingUsers,
    fetchNextPage,
    hasNextPage,
    updateUserRole: updateUserRoleMutation.mutate,
    isUpdatingUserRole: updateUserRoleMutation.isPending,
  };
}