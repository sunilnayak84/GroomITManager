import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { WorkingDays, InsertWorkingDays } from "@/lib/schema";
import { collection, getDocs, setDoc, doc, Timestamp, query, where } from 'firebase/firestore';
const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
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
          // Initialize with default schedule for all days
          const defaultSchedule = Array.from({ length: 7 }, (_, index) => ({
            id: `default-${index}`,
            branchId: branchId ? parseInt(branchId) : 1,
            dayOfWeek: index,
            isOpen: index !== 0, // Closed on Sundays by default
            openingTime: "09:00",
            closingTime: "17:00",
            breakStart: "13:00",
            breakEnd: "14:00",
            maxDailyAppointments: 8,
            createdAt: new Date().toISOString(),
            updatedAt: null
          }));
          return defaultSchedule;
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
          .sort((a, b) => a.dayOfWeek - b.dayOfWeek);

        // Fill in any missing days with default values
        const daysMap = new Map(hours.map(hour => [hour.dayOfWeek, hour]));
        const fullSchedule = Array.from({ length: 7 }, (_, index) => {
          if (daysMap.has(index)) {
            return daysMap.get(index)!;
          }
          return {
            id: `default-${index}`,
            branchId: branchId ? parseInt(branchId) : 1,
            dayOfWeek: index,
            isOpen: index !== 0, // Closed on Sundays by default
            openingTime: "09:00",
            closingTime: "17:00",
            breakStart: "13:00",
            breakEnd: "14:00",
            maxDailyAppointments: 8,
            createdAt: new Date().toISOString(),
            updatedAt: null
          };
        });

        return fullSchedule;
      } catch (error) {
        console.error('Error fetching working hours:', error);
        throw error;
      }
    }
  });

  const addWorkingHoursMutation = useMutation({
    mutationFn: async (data: InsertWorkingDays & { existingId?: string }) => {
      try {
        if (!db) {
          throw new Error('Database connection not initialized');
        }

        const workingHoursRef = collection(db, 'workingHours');
        
        // Check for existing schedule for the same day
        if (!data.existingId) {
          const q = query(
            workingHoursRef, 
            where('dayOfWeek', '==', data.dayOfWeek)
          );
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const error = new Error(`A schedule for ${DAYS_OF_WEEK[data.dayOfWeek]} already exists. Please edit the existing schedule instead.`);
            error.name = 'DuplicateScheduleError';
            throw error;
          }
        }
        
        const dayRef = data.existingId 
          ? doc(workingHoursRef, data.existingId)
          : doc(workingHoursRef);
        
        // Validate and format the data before saving
        const workingHoursData = {
          branchId: data.branchId?.toString() || "1",
          dayOfWeek: Number(data.dayOfWeek),
          isOpen: Boolean(data.isOpen),
          openingTime: data.openingTime || "09:00",
          closingTime: data.closingTime || "17:00",
          breakStart: data.breakStart || null,
          breakEnd: data.breakEnd || null,
          maxDailyAppointments: Number(data.maxDailyAppointments) || 8
        };

        // Add timestamps
        const now = new Date();
        const timestamps = {
          updatedAt: Timestamp.fromDate(now)
        };

        // Only set createdAt for new records
        if (!data.existingId) {
          timestamps.createdAt = Timestamp.fromDate(now);
        }

        // Combine data with timestamps
        const finalData = {
          ...workingHoursData,
          ...timestamps
        };

        // Use merge true to preserve existing fields
        await setDoc(dayRef, finalData, { merge: true });
        return dayRef.id;
      } catch (error) {
        console.error('Error adding working hours:', error);
        
        // Log detailed information about the failed operation
        console.error('Failed operation details:', {
          dayOfWeek: data.dayOfWeek,
          existingId: data.existingId,
          isUpdate: !!data.existingId
        });

        // Provide a more specific error message
        if (error instanceof Error) {
          if (error.message.includes('setDoc')) {
            throw new Error('Failed to save working hours: Invalid data format');
          } else if (error.name === 'DuplicateScheduleError') {
            throw error; // Rethrow duplicate schedule errors
          }
        }
        
        // Throw a general error if we can't determine the specific cause
        throw new Error('Failed to save working hours. Please try again.');
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
