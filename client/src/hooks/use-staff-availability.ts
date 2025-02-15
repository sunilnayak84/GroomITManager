
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
      const availabilityRef = collection(db, 'staffAvailability');
      const docRef = doc(availabilityRef);
      
      const now = new Date().toISOString();
      await setDoc(docRef, {
        ...data,
        createdAt: now,
        updatedAt: now
      });
      
      return docRef.id;
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
