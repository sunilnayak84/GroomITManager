
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getAuth } from 'firebase/auth';
import { toast } from '@/components/ui/use-toast';
import type { InsertStaff } from '@/lib/staff-types';

export function useStaffCreation() {
  const queryClient = useQueryClient();
  const auth = getAuth();

  const createStaff = useMutation({
    mutationFn: async (data: InsertStaff) => {
      console.log('[STAFF_CREATE] Starting staff creation:', data);
      const token = await auth.currentUser?.getIdToken();
      
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch('http://0.0.0.0:3000/api/users/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: data.email,
          name: data.name,
          role: data.role,
          phone: data.phone || '',
          password: 'ChangeMe123!',
          isGroomer: data.role === 'groomer',
          experienceYears: data.experienceYears || 0,
          maxDailyAppointments: data.maxDailyAppointments || 8,
          specialties: data.specialties || [],
          petTypePreferences: data.petTypePreferences || [],
          isActive: true
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create staff member');
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast({
        title: "Success",
        description: "Staff member created successfully"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  return {
    createStaff: createStaff.mutateAsync,
    isCreating: createStaff.isPending
  };
}
