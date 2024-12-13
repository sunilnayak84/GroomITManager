import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { getAuth } from 'firebase/auth';
import { getDatabase, ref, get, set, update } from 'firebase/database';
import { getApp } from 'firebase/app';
import { toast } from '@/components/ui/use-toast';
import type { UserRole } from './use-user';

interface Role {
  name: string;
  permissions: string[];
  description?: string;
  isSystem?: boolean;
  createdAt?: number;
  updatedAt?: number;
  canEdit?: boolean;
}

interface FirebaseUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: string;
  permissions: string[];
  disabled?: boolean;
  lastSignInTime?: string;
  creationTime?: string;
}

interface FirebaseUsersResponse {
  users: FirebaseUser[];
  pageToken?: string | null;
}

async function fetchRoles(): Promise<Role[]> {
  try {
    console.log('[ROLES] Starting role fetch...');
    const auth = getAuth();
    if (!auth.currentUser) {
      console.warn('[ROLES] User not authenticated when fetching roles');
      return [];
    }
    
    // Get fresh ID token
    const token = await auth.currentUser.getIdToken(true);
    console.log('[ROLES] Got fresh ID token');
    
    // Fetch roles from backend API
    const port = import.meta.env.VITE_SERVER_PORT || '3000';
    const response = await fetch(`${window.location.protocol}//${window.location.hostname}:${port}/api/roles`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    });

    if (response.status === 401) {
      // Token expired, refresh and retry
      const newToken = await auth.currentUser.getIdToken(true);
      return await fetchRoles(); // Retry with new token
    }
    
    if (!response.ok) {
      throw new Error(`Failed to fetch roles: ${response.statusText}`);
    }
    
    const fetchedRoles = await response.json() as Role[];
    console.log('[ROLES] Fetched roles:', fetchedRoles);
    
    // Sort roles: system roles first, then alphabetically
    return fetchedRoles.sort((roleA: Role, roleB: Role) => {
      if (roleA.isSystem && !roleB.isSystem) return -1;
      if (!roleB.isSystem && roleA.isSystem) return 1;
      return roleA.name.localeCompare(roleB.name);
    });
    
  } catch (error) {
    console.error('[ROLES] Error in fetchRoles:', error);
    // Return empty array instead of throwing to prevent UI from breaking
    return [];
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
      // Updated URL to use the correct port
      const port = import.meta.env.VITE_SERVER_PORT || '3000';
      const response = await fetch(`${window.location.protocol}//${window.location.hostname}:${port}/api/firebase-users?${searchParams.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[FIREBASE-USERS] Error response:', errorText);
        throw new Error(`Failed to fetch users: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('[FIREBASE-USERS] Successfully fetched users:', data);
      return data;
    };
    
    try {
      return await makeRequest(token);
    } catch (error) {
      if (error instanceof Error && error.message.includes('401')) {
        console.log('[FIREBASE-USERS] Token expired, refreshing...');
        const newToken = await auth.currentUser.getIdToken(true);
        return await makeRequest(newToken);
      }
      console.error('[FIREBASE-USERS] Error in request:', error);
      throw error;
    }
  } catch (error) {
    console.error('[FIREBASE-USERS] Error:', error);
    return { users: [], pageToken: null };
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

  try {
    const token = await auth.currentUser.getIdToken(true);
    console.log('[ROLES] Updating role:', role);

    const response = await fetch(`/api/roles/${encodeURIComponent(role.name)}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: role.name,
        permissions: role.permissions,
        description: role.description
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[ROLES] Error updating role:', error);
      throw new Error(error.message || 'Failed to update role');
    }

    const updatedRole = await response.json();
    console.log('[ROLES] Role updated successfully:', updatedRole);
    return updatedRole;
  } catch (error) {
    console.error('[ROLES] Error in updateRole:', error);
    throw error;
  }
}

export function useRoles() {
  const queryClient = useQueryClient();

  const { data: roles, isLoading: isLoadingRoles } = useQuery({
    queryKey: ['roles'],
    queryFn: fetchRoles,
    staleTime: 1000 * 60, // Cache for 1 minute
    refetchOnWindowFocus: true,
    retry: 3,
  });

  const { data: usersData, isLoading: isLoadingUsers, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ['firebase-users'],
    queryFn: ({ pageParam }) => fetchFirebaseUsers({ pageParam }),
    getNextPageParam: (lastPage: FirebaseUsersResponse) => lastPage.pageToken,
    initialPageParam: null as string | null,
    retry: 3,
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      console.log('[ROLES] Updating user role:', { userId, role });
      await updateUserRole(userId, role);
      // Force token refresh after role update
      const auth = getAuth();
      if (auth.currentUser && auth.currentUser.uid === userId) {
        await auth.currentUser.getIdToken(true);
      }
    },
    onSuccess: (_, variables) => {
      console.log('[ROLES] User role update successful:', variables);
      queryClient.invalidateQueries({ queryKey: ['firebase-users'] });
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast({
        title: 'Success',
        description: 'User role updated successfully. Please log out and log back in to see the changes.',
      });
    },
    onError: (error: Error) => {
      console.error('[ROLES] User role update error:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async (role: Role) => {
      console.log('[ROLES] Starting role update:', role);
      const result = await updateRole(role);
      console.log('[ROLES] Role update result:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('[ROLES] Role updated successfully:', data);
      // Invalidate queries and refetch immediately
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['roles'] }),
        queryClient.invalidateQueries({ queryKey: ['firebase-users'] })
      ]).then(() => {
        queryClient.refetchQueries({ queryKey: ['roles'] });
        queryClient.refetchQueries({ queryKey: ['firebase-users'] });
      });
      
      toast({
        title: 'Success',
        description: 'Role updated successfully',
      });
    },
    onError: (error: Error) => {
      console.error('[ROLES] Role update error:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const createRoleMutation = useMutation({
    mutationFn: async (role: Role) => {
      console.log('[ROLES] Creating new role:', role);
      const result = await createRole(role);
      console.log('[ROLES] Role creation result:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('[ROLES] Role created successfully:', data);
      // Immediately update the cache with the new role
      queryClient.setQueryData(['roles'], (oldData: Role[] | undefined) => {
        if (!oldData) return [data];
        return [...oldData, data];
      });
      
      // Then invalidate and refetch to ensure consistency
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['roles'] }),
        queryClient.invalidateQueries({ queryKey: ['firebase-users'] })
      ]).then(() => {
        queryClient.refetchQueries({ queryKey: ['roles'] });
        queryClient.refetchQueries({ queryKey: ['firebase-users'] });
      });
      
      toast({
        title: 'Success',
        description: 'Role created successfully',
      });
    },
    onError: (error: Error) => {
      console.error('[ROLES] Role creation error:', error);
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