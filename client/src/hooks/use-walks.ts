import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { WalkSession, InsertWalkSession, UpdateWalkSession } from '@/lib/walking-types';

const WALKS_COLLECTION = 'walks';

export function useWalks() {
  const queryClient = useQueryClient();

  // Fetch walks based on different filters
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

          // Apply filters
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

  // Add a new walk session
  const addWalkSession = useMutation({
    mutationFn: async (data: InsertWalkSession) => {
      console.log('Adding walk session with data:', data);

      const walkData = {
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: null
      };

      try {
        const docRef = await addDoc(collection(db, WALKS_COLLECTION), walkData);
        console.log('Walk session added successfully with ID:', docRef.id);
        return docRef.id;
      } catch (error) {
        console.error('Error adding walk session:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['walks'] });
    }
  });

  // Update a walk session
  const updateWalkSession = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateWalkSession }) => {
      console.log('Updating walk session:', id, 'with data:', data);

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

  // Delete a walk session
  const deleteWalkSession = useMutation({
    mutationFn: async (id: string) => {
      console.log('Deleting walk session:', id);
      const docRef = doc(db, WALKS_COLLECTION, id);
      await deleteDoc(docRef);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['walks'] });
    }
  });

  // Update walk status and route
  const updateWalkProgress = useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      routePoint,
      distance 
    }: { 
      id: string; 
      status: 'in_progress' | 'completed'; 
      routePoint?: { lat: number; lng: number; timestamp: Date };
      distance?: number;
    }) => {
      const docRef = doc(db, WALKS_COLLECTION, id);
      const updateData: any = {
        status,
        updatedAt: new Date().toISOString()
      };

      if (status === 'in_progress' && !updateData.actualStartTime) {
        updateData.actualStartTime = new Date().toISOString();
      }

      if (status === 'completed') {
        updateData.actualEndTime = new Date().toISOString();
      }

      if (routePoint) {
        updateData.route = routePoint;
      }

      if (distance) {
        updateData.distance = distance;
      }

      await updateDoc(docRef, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['walks'] });
    }
  });

  return {
    useWalkSessions,
    addWalkSession: addWalkSession.mutate,
    updateWalkSession: updateWalkSession.mutate,
    deleteWalkSession: deleteWalkSession.mutate,
    updateWalkProgress: updateWalkProgress.mutate
  };
}