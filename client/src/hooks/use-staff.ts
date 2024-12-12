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
          where('role', 'in', ['staff', 'groomer'])
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
      const docRef = await addDoc(collection(db, STAFF_COLLECTION), {
        ...data,
        createdAt: new Date().toISOString()
      });
      return docRef.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    }
  });

  const updateStaffMember = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<User> }) => {
      console.log('Updating staff member:', id, 'with data:', data);
      const docRef = doc(db, STAFF_COLLECTION, id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: new Date().toISOString()
      });
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
