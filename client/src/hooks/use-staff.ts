
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getAuth } from 'firebase/auth';
import { User, InsertUser } from '@/lib/user-types';

import { useUser } from './use-user';

export function useStaff() {
  const queryClient = useQueryClient();
  const auth = getAuth();
  const { user } = useUser();

  // Fetch staff members only for admin users
  const { data: staffMembers = [], isLoading } = useQuery({
    queryKey: ['staff'],
    staleTime: 5 * 60 * 1000,
    cacheTime: 30 * 60 * 1000,
    enabled: true,
    queryFn: async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) {
          throw new Error('No authentication token available');
        }

        const port = import.meta.env.VITE_SERVER_PORT || '3000';
        // Only fetch groomers for non-admin users
        const url = `${window.location.protocol}//${window.location.hostname}:${port}/api/groomers`;
        
        const response = await fetch(url, {
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
        if (!data.groomers || !Array.isArray(data.groomers)) {
          console.error('Server response:', data);
          throw new Error('Invalid response format from server');
        }

        const groomers = data.groomers
          .filter(user => !user.disabled)
          .map(user => ({
            id: user.uid || user.id,
            email: user.email,
            name: user.displayName || user.name,
            role: user.role || 'staff',
            isGroomer: true,
            isActive: true,
            phone: user.phoneNumber || user.phone,
            specialties: Array.isArray(user.specialties) ? user.specialties : [],
            branchId: user.branchId || null,
            managedBranchIds: Array.isArray(user.managedBranchIds) ? user.managedBranchIds : [],
            isMultiBranchEnabled: user.isMultiBranchEnabled || false,
            primaryBranchId: user.primaryBranchId || null,
            createdAt: user.createdAt || Date.now(),
            updatedAt: user.updatedAt || null
          }));
        
        return groomers;
      } catch (error) {
        console.error('Error fetching staff:', error);
        throw error;
      }
    }
  });

  // Add new staff member
  const addStaffMember = useMutation({
    mutationFn: async (data: InsertUser) => {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch('/api/users/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...data,
          password: data.password || Math.random().toString(36).slice(-8),
          isGroomer: data.role === 'groomer'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create staff member');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    }
  });

  return {
    staffMembers,
    isLoading,
    addStaffMember: addStaffMember.mutateAsync,
  };
}
