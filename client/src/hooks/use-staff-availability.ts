
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { collection, getDocs, setDoc, doc, query, where, Timestamp } from 'firebase/firestore';
import { db } from "../lib/firebase";
import type { InsertStaffAvailability } from "@/lib/schema";

export function useStaffAvailability(staffId?: string) {
  const queryClient = useQueryClient();

  const { data: availability = [], isLoading } = useQuery({
    queryKey: ["staffAvailability", staffId],
    queryFn: async () => {
      if (!staffId) return [];
      
      console.log('[STAFF_AVAIL] Fetching availability for staffId:', staffId);
      const availabilityRef = collection(db, 'staffAvailability');
      const q = query(availabilityRef, where('staffId', '==', staffId));
      const snapshot = await getDocs(q);
      
      const result = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          staffId: data.staffId,
          dayOfWeek: data.dayOfWeek,
          startTime: data.startTime,
          endTime: data.endTime,
          breakStart: data.breakStart || null,
          breakEnd: data.breakEnd || null,
          isAvailable: data.isAvailable ?? true
        } as (InsertStaffAvailability & { id: string });
      });
      console.log('[STAFF_AVAIL] Fetched availability:', result);
      return result;
    },
    enabled: !!staffId,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true
  });

  const addAvailabilityMutation = useMutation({
    mutationKey: ['addStaffAvailability'],
    mutationFn: async (availability: InsertStaffAvailability) => {
      console.log('[STAFF_AVAIL] Starting mutation:', availability);
      if (!availability.staffId || typeof availability.dayOfWeek !== 'number') {
        console.error('[STAFF_AVAIL] Missing required fields:', { 
          staffId: availability.staffId, 
          dayOfWeek: availability.dayOfWeek,
          type: typeof availability.dayOfWeek 
        });
        throw new Error('Invalid availability data');
      }
      
      try {
        console.log('[Mutation Start]', {
          staffId: availability.staffId,
          dayOfWeek: availability.dayOfWeek,
          isAvailable: availability.isAvailable,
          startTime: availability.startTime,
          endTime: availability.endTime
        });
      const availabilityRef = collection(db, 'staffAvailability');
      const q = query(
        availabilityRef, 
        where('staffId', '==', availability.staffId),
        where('dayOfWeek', '==', availability.dayOfWeek)
      );
      const snapshot = await getDocs(q);
      
      const now = Timestamp.now();
      const data = {
        ...availability,
        isAvailable: availability.isAvailable ?? true,
        updatedAt: now
      };

      let docId;
      if (!snapshot.empty) {
        docId = snapshot.docs[0].id;
        await setDoc(doc(availabilityRef, docId), data);
      } else {
        const newDoc = doc(availabilityRef);
        docId = newDoc.id;
        await setDoc(newDoc, { ...data, createdAt: now });
      }
      
      console.log('[Mutation Success] DocId:', docId);
      return docId;
    } catch (error) {
      console.error('[Mutation Error]', error);
      throw error;
    }
    },
    onSuccess: () => {
      console.log('[Query Invalidation] Invalidating staffAvailability');
      queryClient.invalidateQueries({ queryKey: ["staffAvailability", staffId] });
    }
  });

  return {
    availability,
    isLoading,
    addAvailability: addAvailabilityMutation.mutateAsync,
    isAdding: addAvailabilityMutation.isPending
  };
}
