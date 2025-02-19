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

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const auth = getAuth();
  const token = await auth.currentUser?.getIdToken();

  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('API Error:', errorText);
    throw new Error(errorText || 'Failed to fetch data');
  }

  return response.json();
}

async function fetchRoles(): Promise<Role[]> {
  try {
    return await fetchWithAuth('/api/roles');
  } catch (error) {
    console.error('Error fetching roles:', error);
    throw error;
  }
}

async function createRole(data: { name: string; permissions: string[] }): Promise<Role> {
  return fetchWithAuth('/api/roles', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

async function updateRole(data: { name: string; permissions: string[] }): Promise<Role> {
  return fetchWithAuth(`/api/roles/${data.name}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

async function fetchUsers(pageToken?: string): Promise<UsersResponse> {
  return fetchWithAuth(`/api/users${pageToken ? `?pageToken=${pageToken}` : ''}`);
}

async function updateUserRole({ userId, role }: { userId: string; role: string }): Promise<void> {
  return fetchWithAuth(`/api/users/${userId}/role`, {
    method: 'POST',
    body: JSON.stringify({ role })
  });
}

export function useRoles() {
  const queryClient = useQueryClient();

  const { data: roles, isLoading: isLoadingRoles, error: rolesError } = useQuery({
    queryKey: ['roles'],
    queryFn: fetchRoles,
    retry: 1,
    onError: (error: Error) => {
      console.error('Error fetching roles:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const { data: usersData, isLoading: isLoadingUsers, error: usersError } = useQuery({
    queryKey: ['users'],
    queryFn: () => fetchUsers(),
    retry: 1,
    onError: (error: Error) => {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
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
    roles,
    isLoadingRoles,
    users: usersData?.users ?? [],
    isLoadingUsers,
    createRole: createRoleMutation.mutate,
    updateRole: updateRoleMutation.mutate,
    isCreating: createRoleMutation.isPending,
    isUpdating: updateRoleMutation.isPending,
    updateUserRole: updateUserRoleMutation.mutate,
    isUpdatingUserRole: updateUserRoleMutation.isPending,
    error: rolesError || usersError || createRoleMutation.error || updateRoleMutation.error || updateUserRoleMutation.error
  };
}