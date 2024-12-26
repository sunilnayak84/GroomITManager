import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getAuth } from 'firebase/auth';
import { User, InsertUser } from '@/lib/user-types';
import { useUser } from './use-user';

export function useStaff() {
  const queryClient = useQueryClient();
  const auth = getAuth();
  const { user } = useUser();

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

        const url = '/api/groomers';
        
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Failed to fetch staff members');
        }

        const data = await response.json();
        
        if (!data || !Array.isArray(data.groomers)) {
          console.warn('Invalid groomers response:', data);
          return [];
        }

        const groomers = data.groomers
          .filter(user => {
            return user && Array.isArray(user.specialties) && user.specialties.includes('groomer');
          })
          .map(user => ({
            id: user.uid || user.id,
            name: user.displayName || user.name,
            isActive: user.disabled !== true,
            specialties: user.specialties || []
          }))
          .filter(groomer => groomer.isActive);

        if (!groomers.length) {
          console.warn('No active groomers found in response:', data.groomers);
        }

        return groomers;
      } catch (error) {
        console.error('Error fetching staff:', error);
        throw error;
      }
    }
  });

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