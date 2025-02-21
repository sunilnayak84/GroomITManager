import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAuth } from 'firebase/auth';
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
  creationTime?: string;
}

interface UsersResponse {
  users: User[];
  pageToken?: string | null;
}

// Get the API URL from environment or default to the current origin
const API_BASE_URL = import.meta.env.VITE_API_URL || window.location.origin;
console.log('[API] Base URL:', API_BASE_URL);

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const auth = getAuth();
  const token = await auth.currentUser?.getIdToken();

  if (!token) {
    throw new Error('Not authenticated');
  }

  // Update endpoints to match Firestore collections
  if (url === '/api/roles') {
    url = '/api/role-definitions';
  }

  const fullUrl = `${API_BASE_URL}${url}`;
  console.log('[API] Making request to:', fullUrl);

  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[API] Error response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new Error(errorText || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error('[API] Request failed:', error);
    throw error;
  }
}

async function fetchRoles(): Promise<Role[]> {
  try {
    console.log('[ROLES] Fetching roles...');
    const roles = await fetchWithAuth('/api/roles');
    console.log('[ROLES] Fetched roles:', roles);
    return roles;
  } catch (error) {
    console.error('[ROLES] Error fetching roles:', error);
    throw error;
  }
}

async function createRole(data: { name: string; permissions: string[] }): Promise<Role> {
  try {
    console.log('[ROLES] Creating role:', data);
    const role = await fetchWithAuth('/api/roles', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    console.log('[ROLES] Created role:', role);
    return role;
  } catch (error) {
    console.error('[ROLES] Error creating role:', error);
    throw error;
  }
}

async function updateRole(roleId: string, data: { name: string; permissions: string[] }): Promise<Role> {
  try {
    console.log('[ROLES] Updating role:', { roleId, ...data });
    const role = await fetchWithAuth(`/api/roles/${roleId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    console.log('[ROLES] Updated role:', role);
    return role;
  } catch (error) {
    console.error('[ROLES] Error updating role:', error);
    throw error;
  }
}

async function fetchUsers(pageToken?: string): Promise<UsersResponse> {
  try {
    console.log('[USERS] Fetching users...');
    const response = await fetchWithAuth(`/api/users${pageToken ? `?pageToken=${pageToken}` : ''}`);
    console.log('[USERS] Fetched users:', response);
    return response;
  } catch (error) {
    console.error('[USERS] Error fetching users:', error);
    throw error;
  }
}

async function updateUserRole(params: { userId: string; role: string }): Promise<void> {
  try {
    console.log('[USERS] Updating user role:', params);
    await fetchWithAuth(`/api/users/${params.userId}/role`, {
      method: 'POST',
      body: JSON.stringify({ role: params.role })
    });
    console.log('[USERS] Updated user role successfully');
  } catch (error) {
    console.error('[USERS] Error updating user role:', error);
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
    retry: false
  });

  const { 
    data: usersData, 
    isLoading: isLoadingUsers, 
    error: usersError 
  } = useQuery({
    queryKey: ['users'],
    queryFn: () => fetchUsers(),
    retry: false
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
    mutationFn: ({ roleId, ...data }: { roleId: string; name: string; permissions: string[] }) => 
      updateRole(roleId, data),
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: 'Success',
        description: 'User role updated successfully'
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

  return {
    roles: roles || [],
    isLoadingRoles,
    users: usersData?.users || [],
    isLoadingUsers,
    createRole: createRoleMutation.mutate,
    updateRole: updateRoleMutation.mutate,
    isCreating: createRoleMutation.isPending,
    isUpdating: updateRoleMutation.isPending,
    updateUserRole: updateUserRoleMutation.mutate,
    isUpdatingUserRole: updateUserRoleMutation.isPending,
    error: rolesError || usersError
  };
}