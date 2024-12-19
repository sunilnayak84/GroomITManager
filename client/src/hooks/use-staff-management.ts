import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, getDocs, doc, setDoc, updateDoc, query, where, Timestamp } from 'firebase/firestore';
import type { Staff, InsertStaff, UpdateStaff } from '@/lib/staff-types';
import { staffSchema } from '@/lib/staff-types';
import { toast } from '@/components/ui/use-toast';
import { db } from '@/lib/firebase';

export function useStaffManagement() {
  const queryClient = useQueryClient();
  const auth = getAuth();

  // Fetch all staff members
  const { data: staffMembers = [], isLoading } = useQuery({
    queryKey: ['staff-members'],
    queryFn: async () => {
      try {
        console.log('[STAFF] Starting to fetch staff members');
        const usersCollection = collection(db, 'users');
        const staffQuery = query(usersCollection, where('role', 'in', ['staff', 'groomer']));
        const snapshot = await getDocs(staffQuery);
        
        if (snapshot.empty) {
          console.log('[STAFF] No staff members found');
          return [];
        }

        const staff: Staff[] = [];

        // Convert Firestore data to Staff type and validate
        snapshot.forEach(doc => {
          try {
            const data = doc.data();
            console.log('[STAFF] Processing staff data:', { id: doc.id, data });
            const validatedStaff = staffSchema.parse({
              id: doc.id,
              ...data,
              createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt || new Date().toISOString(),
              updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt
            });
            staff.push(validatedStaff);
          } catch (error) {
            console.error(`[STAFF] Invalid staff data for ID ${doc.id}:`, error);
          }
        });

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
      
      try {
        const auth = getAuth();
        const token = await auth.currentUser?.getIdToken();
        
        if (!token) {
          throw new Error('Not authenticated');
        }

        console.log('[STAFF] Starting staff creation with data:', data);
        

        // First create the user in Firebase Auth
        const response = await fetch('/api/users/create', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: data.email,
            name: data.name,
            role: data.role,
            password: 'ChangeMe123!', // Default password
            isGroomer: data.role === 'groomer',
            phone: data.phone,
            experienceYears: data.experienceYears || 0,
            maxDailyAppointments: data.maxDailyAppointments || 8,
            specialties: data.specialties || [],
            petTypePreferences: data.petTypePreferences || [],
            isActive: true
          }),
        });

        console.log('[STAFF] API Response status:', response.status);
        
        const responseData = await response.json();
        console.log('[STAFF] API Response data:', responseData);

        if (!response.ok) {
          throw new Error(responseData.message || 'Failed to create staff member');
        }

        return responseData.user;
      } catch (error) {
        console.error('[STAFF] Error creating staff:', error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to create staff member",
          variant: "destructive"
        });
        throw error;
      }
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
      const staffRef = doc(db, 'users', id);
      
      const updateData = {
        ...data,
        updatedAt: Timestamp.now()
      };

      await updateDoc(staffRef, updateData);
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

  // Deactivate staff member
  const deactivateStaff = useMutation({
    mutationFn: async (id: string) => {
      console.log('[STAFF] Deactivating staff member:', id);
      const staffRef = doc(db, 'users', id);
      
      await updateDoc(staffRef, {
        isActive: false,
        updatedAt: Timestamp.now()
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
  const getAvailableGroomers = (branchId?: string) => {
    console.log('[STAFF] Getting available groomers:', {
      totalStaff: staffMembers.length,
      branchId
    });

    const availableGroomers = staffMembers.filter(staff => {
      // Check if staff is active and is a groomer
      const isActiveGroomer = staff.isActive && (staff.role === 'groomer' || staff.isGroomer === true);
      
      // Log individual staff member evaluation
      console.log('[STAFF] Evaluating staff member:', {
        id: staff.id,
        name: staff.name,
        isActive: staff.isActive,
        role: staff.role,
        isGroomer: staff.isGroomer,
        branchId: staff.branchId,
        isMultiBranchEnabled: staff.isMultiBranchEnabled,
        managedBranchIds: staff.managedBranchIds,
        meetsGroomerCriteria: isActiveGroomer
      });

      // If no branch specified, return all active groomers
      if (!branchId) {
        return isActiveGroomer;
      }

      // Check branch access
      const hasBranchAccess = 
        staff.branchId === branchId || 
        staff.isMultiBranchEnabled === true ||
        (Array.isArray(staff.managedBranchIds) && staff.managedBranchIds.includes(branchId));

      return isActiveGroomer && hasBranchAccess;
    });

    console.log('[STAFF] Available groomers found:', {
      count: availableGroomers.length,
      groomers: availableGroomers.map(g => ({
        id: g.id,
        name: g.name,
        branchId: g.branchId
      }))
    });

    return availableGroomers;
  };

  // Get staff members by branch
  const getStaffByBranch = (branchId: string) => {
    return staffMembers.filter(staff => 
      staff.branchId === branchId || 
      staff.isMultiBranchEnabled ||
      staff.managedBranchIds.includes(branchId)
    );
  };

  // Update staff branch assignments
  const updateStaffBranches = useMutation({
    mutationFn: async ({ 
      staffId, 
      primaryBranchId,
      managedBranchIds,
      isMultiBranchEnabled 
    }: {
      staffId: string;
      primaryBranchId: string;
      managedBranchIds: string[];
      isMultiBranchEnabled: boolean;
    }) => {
      console.log('[STAFF] Updating staff branch assignments:', { 
        staffId, 
        primaryBranchId,
        managedBranchIds,
        isMultiBranchEnabled 
      });
      
      const staffRef = doc(db, 'users', staffId);
      const updateData = {
        branchId: primaryBranchId,
        primaryBranchId,
        managedBranchIds,
        isMultiBranchEnabled,
        updatedAt: Timestamp.now()
      };

      await updateDoc(staffRef, updateData);
      return { id: staffId, ...updateData };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-members'] });
      toast({
        title: "Success",
        description: "Staff branch assignments updated successfully"
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
    staffMembers,
    isLoading,
    addStaff: addStaff.mutateAsync,
    updateStaff: updateStaff.mutateAsync,
    deactivateStaff: deactivateStaff.mutateAsync,
    getAvailableGroomers,
    getStaffByBranch,
    updateStaffBranches: updateStaffBranches.mutateAsync,
    isAddingStaff: addStaff.isPending,
    isUpdatingStaff: updateStaff.isPending,
    isDeactivatingStaff: deactivateStaff.isPending,
    isUpdatingBranches: updateStaffBranches.isPending
  };
}