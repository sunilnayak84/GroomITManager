import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getAuth } from 'firebase/auth';
import { User, InsertUser } from '@/lib/user-types';

export function useStaff() {
  const queryClient = useQueryClient();
  const auth = getAuth();

  // Fetch staff members
  const { data: staffMembers = [], isLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      console.log('FETCH_STAFF: Starting to fetch staff members');
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) throw new Error('No authentication token available');

        // Get server port from environment variable
        const port = import.meta.env.VITE_SERVER_PORT || '3000';
        const response = await fetch(`${window.location.protocol}//${window.location.hostname}:${port}/api/firebase-users?role=staff`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });

        if (!response.ok) {
          let errorMessage = 'Failed to fetch staff members';
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
          } catch (e) {
            console.error('Error parsing error response:', e);
          }
          throw new Error(errorMessage);
        }

        const data = await response.json();
        console.log('FETCH_STAFF: Retrieved data:', data);
        
        if (!data.users || !Array.isArray(data.users)) {
          console.error('FETCH_STAFF: Invalid response format', data);
          throw new Error('Invalid response format from server');
        }
        
        const staff = data.users.filter(user => user.role === 'staff');
        console.log('FETCH_STAFF: Successfully filtered staff members:', staff);
        return staff;
      } catch (error) {
        console.error('FETCH_STAFF: Error fetching staff:', error);
        throw error;
      }
    }
  });

  // Add new staff member
  const addStaffMember = useMutation({
    mutationFn: async (data: InsertUser) => {
      console.log('STAFF_CREATE: Starting to create staff member:', data);
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      // First create the user in Firebase Auth
      const response = await fetch('/api/users/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...data,
          password: data.password || Math.random().toString(36).slice(-8),
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create staff member');
      }

      const result = await response.json();
      console.log('STAFF_CREATE: Successfully created staff member:', result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    }
  });

  // Update existing staff member
  const updateStaffMember = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<User> }) => {
      console.log('STAFF_UPDATE: Updating staff member:', { id, data });
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch(`/api/staff/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update staff member');
      }

      const result = await response.json();
      console.log('STAFF_UPDATE: Successfully updated staff member:', result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    }
  });

  // Delete staff member
  const deleteStaffMember = useMutation({
    mutationFn: async (id: string) => {
      console.log('STAFF_DELETE: Deleting staff member:', id);
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch(`/api/staff/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete staff member');
      }

      console.log('STAFF_DELETE: Successfully deleted staff member:', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    }
  });

  return {
    staffMembers,
    isLoading,
    addStaffMember: addStaffMember.mutateAsync,
    updateStaffMember: updateStaffMember.mutateAsync,
    deleteStaffMember: deleteStaffMember.mutateAsync
  };
}
