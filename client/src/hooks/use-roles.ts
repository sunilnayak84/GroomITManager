import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAuth } from 'firebase/auth';

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

async function fetchRoles(): Promise<Role[]> {
  const auth = getAuth();
  const token = await auth.currentUser?.getIdToken();

  const response = await fetch('/api/roles', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch roles');
  }

  return response.json();
}

async function fetchUsers(): Promise<UsersResponse> {
  const auth = getAuth();
  const token = await auth.currentUser?.getIdToken();

  const response = await fetch('/api/users', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch users');
  }

  return response.json();
}

async function updateUserRole(userId: string, role: string): Promise<void> {
  const auth = getAuth();
  const token = await auth.currentUser?.getIdToken();

  const response = await fetch(`/api/users/${userId}/role`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ role })
  });

  if (!response.ok) {
    throw new Error('Failed to update user role');
  }
}

export function useRoles() {
  const queryClient = useQueryClient();

  const { data: roles, isLoading: isLoadingRoles } = useQuery({
    queryKey: ['roles'],
    queryFn: fetchRoles
  });

  const { data: usersData, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) => 
      updateUserRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });

  return {
    roles,
    isLoadingRoles,
    users: usersData?.users ?? [],
    isLoadingUsers,
    updateUserRole: updateRoleMutation.mutate,
    isUpdatingRole: updateRoleMutation.isPending
  };
}