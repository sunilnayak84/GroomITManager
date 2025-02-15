
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
      
      const availabilityRef = collection(db, 'staffAvailability');
      const q = query(availabilityRef, where('staffId', '==', staffId));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    },
    enabled: !!staffId
  });

  const addAvailabilityMutation = useMutation({
    mutationFn: async (availability: InsertStaffAvailability) => {
      console.log('Starting mutation with data:', availability);
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
          console.log('Updating existing doc:', docId);
          await setDoc(doc(availabilityRef, docId), data);
        } else {
          const newDoc = doc(availabilityRef);
          docId = newDoc.id;
          console.log('Creating new doc:', docId);
          await setDoc(newDoc, { ...data, createdAt: now });
        }
        
        return docId;
      } catch (error) {
        console.error('Error in mutation:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staffAvailability"] });
    }
  });

  return {
    availability,
    isLoading,
    addAvailability: addAvailabilityMutation.mutateAsync,
    isAdding: addAvailabilityMutation.isPending
  };
}
