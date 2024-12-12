import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { WorkingDays, InsertWorkingDays } from "@/lib/schema";
import { collection, getDocs, setDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from "../lib/firebase";

interface FirestoreWorkingDays {
  branchId: string;
  dayOfWeek: number;
  isOpen: boolean;
  openingTime: string;
  closingTime: string;
  breakStart?: string | null;
  breakEnd?: string | null;
  maxDailyAppointments?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp | null;
}

export function useWorkingHours(branchId?: string) {
  const queryClient = useQueryClient();

  const { data: workingHours, isLoading, error } = useQuery<WorkingDays[]>({
    queryKey: ["workingHours", branchId],
    queryFn: async () => {
      try {
        if (!db) {
          throw new Error('Firebase not initialized');
        }

        const workingHoursRef = collection(db, 'workingHours');
        const querySnapshot = await getDocs(workingHoursRef);

        if (querySnapshot.empty) {
          return [];
        }

        const hours = querySnapshot.docs
          .map(doc => {
            const data = doc.data() as FirestoreWorkingDays;
            return {
              id: doc.id,
              branchId: parseInt(data.branchId),
              dayOfWeek: data.dayOfWeek,
              isOpen: data.isOpen,
              openingTime: data.openingTime,
              closingTime: data.closingTime,
              breakStart: data.breakStart || null,
              breakEnd: data.breakEnd || null,
              maxDailyAppointments: data.maxDailyAppointments || 8,
              createdAt: data.createdAt.toDate().toISOString(),
              updatedAt: data.updatedAt?.toDate().toISOString() || null
            };
          })
          .filter(hour => !branchId || hour.branchId.toString() === branchId);

        return hours;
      } catch (error) {
        console.error('Error fetching working hours:', error);
        throw error;
      }
    }
  });

  const addWorkingHoursMutation = useMutation({
    mutationFn: async (data: InsertWorkingDays) => {
      try {
        const workingHoursRef = collection(db, 'workingHours');
        const newWorkingHoursRef = doc(workingHoursRef);
        
        const workingHoursData = {
          branchId: data.branchId.toString(),
          dayOfWeek: data.dayOfWeek,
          isOpen: data.isOpen,
          openingTime: data.openingTime,
          closingTime: data.closingTime,
          breakStart: data.breakStart,
          breakEnd: data.breakEnd,
          maxDailyAppointments: data.maxDailyAppointments,
          createdAt: Timestamp.fromDate(new Date()),
          updatedAt: null
        };

        await setDoc(newWorkingHoursRef, workingHoursData);
        return newWorkingHoursRef.id;
      } catch (error) {
        console.error('Error adding working hours:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workingHours"] });
    }
  });

  return {
    data: workingHours,
    isLoading,
    error,
    addWorkingHours: addWorkingHoursMutation.mutateAsync
  };
}
