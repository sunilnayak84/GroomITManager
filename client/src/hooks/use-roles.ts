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

  console.log('[API] Making request to:', url);
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
    console.error('[API] Error response:', errorText);
    throw new Error(errorText || 'Failed to fetch data');
  }

  return response.json();
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

export function useRoles() {
  const queryClient = useQueryClient();

  const { data: roles, isLoading: isLoadingRoles, error: rolesError } = useQuery({
    queryKey: ['roles'],
    queryFn: fetchRoles,
    retry: false,
    onError: (error: Error) => {
      console.error('[ROLES] Query error:', error);
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
    retry: false,
    onError: (error: Error) => {
      console.error('[USERS] Query error:', error);
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
    error: rolesError || usersError
  };
}