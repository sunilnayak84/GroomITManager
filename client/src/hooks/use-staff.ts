import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { User, InsertUser } from '@/lib/user-types';

const STAFF_COLLECTION = 'users';

export function useStaff() {
  const queryClient = useQueryClient();

  const { data: staffMembers = [], isLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      console.log('FETCH_STAFF: Starting to fetch staff members');
      try {
        const q = query(
          collection(db, STAFF_COLLECTION),
          where('role', 'in', ['staff', 'groomer', 'pet_walker'])
        );
        const snapshot = await getDocs(q);
        const staff = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as User[];

        console.log('FETCH_STAFF: Successfully fetched staff members:', staff);
        return staff;
      } catch (error) {
        console.error('FETCH_STAFF: Error fetching staff:', error);
        throw error;
      }
    }
  });

  const addStaffMember = useMutation({
    mutationFn: async (data: InsertUser) => {
      console.log('Adding staff member with data:', data);

      // First create Firebase Auth user with a default password
      const response = await fetch('/api/staff/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
          name: data.name,
          role: data.role,
          password: 'Welcome123!' // Default password that user should change
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create staff member in Firebase Auth');
      }

      const { uid } = await response.json();

      // Then create Firestore record
      const staffData = {
        ...data,
        id: uid,
        createdAt: new Date().toISOString(),
        isActive: true,
        walkingPreferences: data.role === 'pet_walker' ? {
          maxDistance: data.walkingPreferences?.maxDistance || 5,
          preferredAreas: data.walkingPreferences?.preferredAreas || [],
          availableTimeSlots: data.walkingPreferences?.availableTimeSlots || [],
          simultaneousWalks: data.walkingPreferences?.simultaneousWalks || 1
        } : null
      };

      console.log('Final staff data being saved:', staffData);
      const docRef = doc(db, STAFF_COLLECTION, uid);
      await setDoc(docRef, staffData);
      
      // Verify the document was created
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        throw new Error('Failed to create staff document in Firestore');
      }
      
      return uid;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    }
  });

  const updateStaffMember = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<User> }) => {
      console.log('Updating staff member:', id, 'with data:', data);
      const docRef = doc(db, STAFF_COLLECTION, id);

      const updateData = {
        ...data,
        updatedAt: new Date().toISOString(),
        walkingPreferences: data.role === 'pet_walker' ? {
          maxDistance: data.walkingPreferences?.maxDistance || 5,
          preferredAreas: data.walkingPreferences?.preferredAreas || [],
          availableTimeSlots: data.walkingPreferences?.availableTimeSlots || [],
          simultaneousWalks: data.walkingPreferences?.simultaneousWalks || 1
        } : null
      };

      await updateDoc(docRef, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    }
  });

  const deleteStaffMember = useMutation({
    mutationFn: async (id: string) => {
      console.log('Deleting staff member:', id);
      const docRef = doc(db, STAFF_COLLECTION, id);
      await deleteDoc(docRef);
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