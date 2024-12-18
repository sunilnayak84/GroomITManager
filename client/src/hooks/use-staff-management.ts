import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getAuth } from 'firebase/auth';
import { getDatabase, ref, get, set, update, remove, push } from 'firebase/database';
import type { Staff, InsertStaff, UpdateStaff } from '@/lib/staff-types';
import { staffSchema } from '@/lib/staff-types';
import { toast } from '@/components/ui/use-toast';

export function useStaffManagement() {
  const queryClient = useQueryClient();
  const auth = getAuth();

  // Fetch all staff members
  const { data: staffMembers = [], isLoading } = useQuery({
    queryKey: ['staff-members'],
    queryFn: async () => {
      try {
        console.log('[STAFF] Starting to fetch staff members');
        const db = getDatabase();
        const staffRef = ref(db, 'users');
        const snapshot = await get(staffRef);
        
        if (!snapshot.exists()) {
          console.log('[STAFF] No staff members found');
          return [];
        }

        const staffData = snapshot.val();
        const staff: Staff[] = [];

        // Convert Firebase data to Staff type and validate
        for (const [id, data] of Object.entries<any>(staffData)) {
          try {
            const validatedStaff = staffSchema.parse({
              id,
              ...data
            });
            staff.push(validatedStaff);
          } catch (error) {
            console.error(`[STAFF] Invalid staff data for ID ${id}:`, error);
          }
        }

        console.log('[STAFF] Successfully fetched staff members:', staff.length);
        return staff;
      } catch (error) {
        console.error('[STAFF] Error fetching staff:', error);
        throw error;
      }
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Add new staff member
  const addStaff = useMutation({
    mutationFn: async (data: InsertStaff) => {
      console.log('[STAFF] Creating new staff member:', data);
      const db = getDatabase();
      const staffRef = ref(db, 'users');
      const newStaffRef = push(staffRef);
      
      const timestamp = Date.now();
      const staffData = {
        ...data,
        id: newStaffRef.key,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      await set(newStaffRef, staffData);
      return staffData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-members'] });
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

  // Update staff member
  const updateStaff = useMutation({
    mutationFn: async ({ id, ...data }: UpdateStaff) => {
      console.log('[STAFF] Updating staff member:', { id, data });
      const db = getDatabase();
      const staffRef = ref(db, `users/${id}`);
      
      const updateData = {
        ...data,
        updatedAt: Date.now()
      };

      await update(staffRef, updateData);
      return { id, ...updateData };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-members'] });
      toast({
        title: "Success",
        description: "Staff member updated successfully"
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

  // Delete/deactivate staff member
  const deactivateStaff = useMutation({
    mutationFn: async (id: string) => {
      console.log('[STAFF] Deactivating staff member:', id);
      const db = getDatabase();
      const staffRef = ref(db, `users/${id}`);
      
      await update(staffRef, {
        isActive: false,
        updatedAt: Date.now()
      });

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-members'] });
      toast({
        title: "Success",
        description: "Staff member deactivated successfully"
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

  // Get available groomers (active staff members who are groomers)
  const getAvailableGroomers = () => {
    return staffMembers.filter(staff => 
      staff.isActive && (staff.role === 'groomer' || staff.isGroomer)
    );
  };

  return {
    staffMembers,
    isLoading,
    addStaff: addStaff.mutateAsync,
    updateStaff: updateStaff.mutateAsync,
    deactivateStaff: deactivateStaff.mutateAsync,
    getAvailableGroomers,
    isAddingStaff: addStaff.isPending,
    isUpdatingStaff: updateStaff.isPending,
    isDeactivatingStaff: deactivateStaff.isPending
  };
}
