import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { getAuth } from 'firebase/auth';
import { toast } from '@/components/ui/use-toast';
import type { UserRole } from './use-user';

interface Role {
  name: string;
  permissions: string[];
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
    const token = await auth.currentUser.getIdToken(true);
    console.log('[ROLES] Fetching roles with token:', token.substring(0, 10) + '...');
    const response = await fetch('/api/roles', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to fetch roles:', errorText);
      throw new Error(`Failed to fetch roles: ${errorText}`);
    }
    
    return response.json();
  } catch (error) {
    console.error('Error in fetchRoles:', error);
    throw error;
  }
}

async function fetchFirebaseUsers(params: { pageParam?: string | null }): Promise<FirebaseUsersResponse> {
  const auth = getAuth();
  if (!auth.currentUser) {
    console.warn('User not authenticated when fetching Firebase users');
    return { users: [], pageToken: null };
  }
  
  try {
    // Force token refresh to ensure we have a valid token
    const token = await auth.currentUser.getIdToken(true);
    
    const searchParams = new URLSearchParams();
    if (params.pageParam) {
      searchParams.append('pageToken', params.pageParam);
    }
    
    console.log('[FIREBASE-USERS] Starting fetch with params:', params);
    console.log('[FIREBASE-USERS] Using token:', token.substring(0, 10) + '...');
    
    const response = await fetch('/api/firebase-users?' + searchParams.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      credentials: 'include'
    });

    if (response.status === 401) {
      console.error('[FIREBASE-USERS] Authentication failed. Refreshing token...');
      // Try to refresh token and retry
      const newToken = await auth.currentUser.getIdToken(true);
      const retryResponse = await fetch(`/api/firebase-users?${searchParams.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${newToken}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        credentials: 'include'
      });
      
      if (!retryResponse.ok) {
        throw new Error(`Failed to fetch users after token refresh: ${await retryResponse.text()}`);
      }
      return retryResponse.json();
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to fetch Firebase users:', errorText);
      throw new Error(`Failed to fetch users: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Successfully fetched Firebase users:', data);
    return data;
  } catch (error) {
    console.error('Error in fetchFirebaseUsers:', error);
    throw error;
  }
}

async function updateUserRole(userId: string, role: string): Promise<void> {
  const response = await fetch(`/api/firebase-users/${userId}/role`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ role }),
  });
  if (!response.ok) {
    throw new Error('Failed to update user role');
  }
}

async function createRole(role: Role): Promise<Role> {
  const response = await fetch('/api/roles', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(role),
  });
  if (!response.ok) {
    throw new Error('Failed to create role');
  }
  return response.json();
}

async function updateRole(role: Role): Promise<Role> {
  const response = await fetch(`/api/roles/${role.name}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(role),
  });
  if (!response.ok) {
    throw new Error('Failed to update role');
  }
  return response.json();
}

export function useRoles() {
  const queryClient = useQueryClient();

  const { data: roles, isLoading: isLoadingRoles } = useQuery({
    queryKey: ['roles'],
    queryFn: fetchRoles,
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
    mutationFn: updateRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast({
        title: 'Success',
        description: 'Role updated successfully',
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