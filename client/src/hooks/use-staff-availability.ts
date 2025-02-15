
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { collection, getDocs, setDoc, doc, Timestamp, query, where } from 'firebase/firestore';
import { db } from "../lib/firebase";
import type { StaffAvailability, InsertStaffAvailability } from "@/lib/schema";

export function useStaffAvailability(staffId?: string) {
  const queryClient = useQueryClient();

  const { data: availability, isLoading } = useQuery<StaffAvailability[]>({
    queryKey: ["staffAvailability", staffId],
    queryFn: async () => {
      if (!staffId) return [];
      
      const availabilityRef = collection(db, 'staffAvailability');
      const q = query(availabilityRef, where('staffId', '==', staffId));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data() as StaffAvailability
      }));
    },
    enabled: !!staffId
  });

  const addAvailabilityMutation = useMutation({
    mutationFn: async (data: InsertStaffAvailability) => {
      try {
        const availabilityRef = collection(db, 'staffAvailability');
        const q = query(availabilityRef, 
          where('staffId', '==', data.staffId),
          where('dayOfWeek', '==', data.dayOfWeek)
        );
        const snapshot = await getDocs(q);
        
        const now = new Date().toISOString();
        const availabilityData = {
          ...data,
          startTime: data.startTime || null,
          endTime: data.endTime || null,
          breakStart: data.breakStart || null,
          breakEnd: data.breakEnd || null,
          updatedAt: now
        };

        if (!snapshot.empty) {
          const docRef = doc(availabilityRef, snapshot.docs[0].id);
          await setDoc(docRef, availabilityData, { merge: true });
          return docRef.id;
        } else {
          const docRef = doc(availabilityRef);
          await setDoc(docRef, {
            ...availabilityData,
            createdAt: now
          });
          return docRef.id;
        }
      } catch (error) {
        console.error('Error saving availability:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staffAvailability"] });
    }
  });

  return {
    data: availability,
    isLoading,
    addAvailability: addAvailabilityMutation.mutateAsync
  };
}
