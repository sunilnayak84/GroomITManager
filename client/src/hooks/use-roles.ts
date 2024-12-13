import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
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
  const response = await fetch('/api/roles');
  if (!response.ok) {
    throw new Error('Failed to fetch roles');
  }
  return response.json();
}

async function fetchFirebaseUsers(params: { pageParam?: string | null }): Promise<FirebaseUsersResponse> {
  const searchParams = new URLSearchParams();
  if (params.pageParam) {
    searchParams.append('pageToken', params.pageParam);
  }
  const response = await fetch(`/api/firebase-users?${searchParams}`);
  if (!response.ok) {
    throw new Error('Failed to fetch users');
  }
  return response.json();
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
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      updateUserRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firebase-users'] });
      toast({
        title: 'Success',
        description: 'User role updated successfully',
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