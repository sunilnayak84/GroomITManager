import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAuth } from 'firebase/auth';
import { toast } from '@/components/ui/use-toast';
import type { Staff, InsertStaff, UpdateStaff } from '@/lib/staff-types';

export function useStaffManagement() {
  const queryClient = useQueryClient();
  const auth = getAuth();

  const { data: staffMembers = [], isLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      console.log('[STAFF] Starting to fetch staff members');
      const token = await auth.currentUser?.getIdToken();
      
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch('/api/staff', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch staff members');
      }

      return response.json();
    }
  });

  const addStaff = useMutation({
    mutationFn: async (data: InsertStaff) => {
      const token = await auth.currentUser?.getIdToken();
      
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch('/api/users/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...data,
          specialties: Array.isArray(data.specialties) ? data.specialties : [],
          password: 'ChangeMe123!',
          role: data.role || 'staff',
          isGroomer: false
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || 'Failed to create staff member');
      }

      const responseData = await response.text();
      return responseData ? JSON.parse(responseData) : null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast({
        title: "Success",
        description: "Staff member created successfully"
      });
    }
  });

  const updateStaff = useMutation({
    mutationFn: async (data: UpdateStaff) => {
      const token = await auth.currentUser?.getIdToken();
      
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`/api/staff/${data.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error('Failed to update staff member');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast({
        title: "Success",
        description: "Staff member updated successfully"
      });
    }
  });

  const deactivateStaff = useMutation({
    mutationFn: async (id: string) => {
      const token = await auth.currentUser?.getIdToken();
      
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`/api/staff/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to deactivate staff member');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast({
        title: "Success",
        description: "Staff member deactivated successfully"
      });
    }
  });

  return {
    staffMembers,
    isLoading,
    addStaff: addStaff.mutateAsync,
    updateStaff: updateStaff.mutateAsync,
    deactivateStaff: deactivateStaff.mutateAsync
  };
}