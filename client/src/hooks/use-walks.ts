import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { WalkSession, InsertWalkSession, UpdateWalkSession } from '@/lib/walking-types';

const WALKS_COLLECTION = 'walks';

export function useWalks() {
  const queryClient = useQueryClient();

  const useWalkSessions = ({
    walkerId,
    petId,
    customerId,
    status
  }: {
    walkerId?: string;
    petId?: string;
    customerId?: string;
    status?: string;
  } = {}) => {
    return useQuery({
      queryKey: ['walks', { walkerId, petId, customerId, status }],
      queryFn: async () => {
        try {
          let q = query(collection(db, WALKS_COLLECTION));

          if (walkerId) {
            q = query(q, where('walkerId', '==', walkerId));
          }
          if (petId) {
            q = query(q, where('petId', '==', petId));
          }
          if (customerId) {
            q = query(q, where('customerId', '==', customerId));
          }
          if (status) {
            q = query(q, where('status', '==', status));
          }

          const snapshot = await getDocs(q);
          return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as WalkSession[];
        } catch (error) {
          console.error('Error fetching walks:', error);
          throw error;
        }
      }
    });
  };

  const addWalkSession = useMutation({
    mutationFn: async (data: InsertWalkSession): Promise<string> => {
      try {
        console.log('Adding walk session with data:', data);
        const walkData = {
          ...data,
          createdAt: new Date().toISOString(),
          updatedAt: null
        };

        const docRef = await addDoc(collection(db, WALKS_COLLECTION), walkData);
        console.log('Walk session added with ID:', docRef.id);
        return docRef.id;
      } catch (error) {
        console.error('Error adding walk session:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['walks'] });
    },
    onError: (error) => {
      console.error('Mutation error:', error);
    }
  });

  const updateWalkSession = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateWalkSession }) => {
      const updateData = {
        ...data,
        updatedAt: new Date().toISOString()
      };

      const docRef = doc(db, WALKS_COLLECTION, id);
      await updateDoc(docRef, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['walks'] });
    }
  });

  const deleteWalkSession = useMutation({
    mutationFn: async (id: string) => {
      const docRef = doc(db, WALKS_COLLECTION, id);
      await deleteDoc(docRef);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['walks'] });
    }
  });

  return {
    useWalkSessions,
    addWalkSession: addWalkSession.mutateAsync,
    updateWalkSession: updateWalkSession.mutate,
    deleteWalkSession: deleteWalkSession.mutate
  };
}