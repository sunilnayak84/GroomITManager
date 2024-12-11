import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { AppointmentWithRelations, InsertAppointment, Appointment } from "@/lib/schema";
import { collection, getDocs, addDoc, onSnapshot, query, getDoc, doc, WithFieldValue, DocumentData, Timestamp } from 'firebase/firestore';
import { appointmentsCollection, petsCollection, customersCollection, usersCollection } from "../lib/firestore";
import React from "react";

type FirestoreAppointmentData = {
  id?: string;
  petId: string;
  serviceId: string;
  groomerId: string;
  branchId: string;
  date: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  notes: string | null;
  productsUsed: string | null;
  createdAt: string;
  updatedAt: string | null;
};

// Helper function to convert Date | null to Date | undefined
const toDateOrUndefined = (value: unknown): Date | undefined => {
  const date = toSafeDate(value);
  return date === null ? undefined : date;
};

// Helper function to safely convert to Date
const toSafeDate = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  try {
    const date = new Date(value as string | number);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
};

export function useAppointments() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<AppointmentWithRelations[]>({
    queryKey: ["appointments"],
    queryFn: async () => {
      const querySnapshot = await getDocs(appointmentsCollection);
      const appointments: AppointmentWithRelations[] = [];

      for (const appointmentDoc of querySnapshot.docs) {
        const appointmentData = appointmentDoc.data() as WithFieldValue<FirestoreAppointmentData>;
        if (!appointmentData) continue;

        try {
          // Get pet details
          const petDoc = await getDoc(doc(petsCollection, appointmentData.petId as string));
          const petData = petDoc.data();
          if (!petData) continue;

          // Get customer details through pet's customerId
          const customerDoc = await getDoc(doc(customersCollection, petData.customerId as string));
          const customerData = customerDoc.data();
          if (!customerData) continue;

          // Get groomer details
          const groomerRef = doc(usersCollection, appointmentData.groomerId as string);
          const groomerDoc = await getDoc(groomerRef);
          const groomerData = groomerDoc.data();
          if (!groomerData) continue;

          const status = appointmentData.status as AppointmentWithRelations['status'];
          if (!['pending', 'confirmed', 'completed', 'cancelled'].includes(status)) {
            console.error('Invalid appointment status:', status);
            continue;
          }

          const appointmentDate = toSafeDate(appointmentData.date);
          if (!appointmentDate) {
            console.error('Invalid appointment date:', appointmentDoc.id);
            continue;
          }

          const createdDate = toSafeDate(appointmentData.createdAt);
          if (!createdDate) {
            console.error('Invalid created date for appointment:', appointmentDoc.id);
            continue;
          }

          const appointment: AppointmentWithRelations = {
            id: appointmentDoc.id,
            petId: appointmentData.petId as string,
            serviceId: appointmentData.serviceId as string,
            groomerId: appointmentData.groomerId as string,
            branchId: appointmentData.branchId as string,
            date: appointmentDate,
            status,
            notes: (appointmentData.notes as string | null) ?? null,
            productsUsed: (appointmentData.productsUsed as string | null) ?? null,
            createdAt: createdDate,
            updatedAt: toDateOrUndefined(appointmentData.updatedAt),
            pet: {
              name: petData.name as string,
              breed: petData.breed as string,
              image: (petData.image as string | null) ?? null
            },
            customer: {
              firstName: customerData.firstName as string,
              lastName: customerData.lastName as string
            },
            groomer: {
              name: groomerData.name as string
            }
          };

          appointments.push(appointment);
        } catch (error) {
          console.error('Error processing appointment:', appointmentDoc.id, error);
          continue;
        }
      }

      return appointments;
    },
  });

  const addAppointmentMutation = useMutation({
    mutationFn: async (appointmentData: InsertAppointment) => {
      try {
        console.log('Adding appointment with data:', appointmentData);
        const timestamp = new Date().toISOString();
        
        // Prepare the data for Firestore
        const firestoreData: WithFieldValue<FirestoreAppointmentData> = {
          petId: appointmentData.petId,
          serviceId: appointmentData.serviceId,
          groomerId: appointmentData.groomerId,
          branchId: appointmentData.branchId,
          date: typeof appointmentData.date === 'string' 
            ? appointmentData.date 
            : appointmentData.date.toISOString(),
          status: appointmentData.status || 'pending',
          notes: appointmentData.notes || null,
          productsUsed: appointmentData.productsUsed || null,
          createdAt: timestamp,
          updatedAt: null
        };

        console.log('Prepared Firestore data:', firestoreData);
        const docRef = await addDoc(appointmentsCollection, firestoreData);
        
        return {
          id: docRef.id,
          ...firestoreData
        };
      } catch (error) {
        console.error('Error adding appointment:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: (error) => {
      console.error('Failed to add appointment:', error);
      throw error;
    }
  });

  // Set up real-time updates
  React.useEffect(() => {
    const q = query(appointmentsCollection);
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const appointments: AppointmentWithRelations[] = [];
      
      for (const appointmentDoc of snapshot.docs) {
        try {
          const appointmentData = appointmentDoc.data() as WithFieldValue<FirestoreAppointmentData>;
          if (!appointmentData) continue;

          // Get pet details
          const petDoc = await getDoc(doc(petsCollection, appointmentData.petId as string));
          const petData = petDoc.data();
          if (!petData) continue;

          // Get customer details through pet's customerId
          const customerDoc = await getDoc(doc(customersCollection, petData.customerId as string));
          const customerData = customerDoc.data();
          if (!customerData) continue;

          // Get groomer details
          const groomerRef = doc(usersCollection, appointmentData.groomerId as string);
          const groomerDoc = await getDoc(groomerRef);
          const groomerData = groomerDoc.data();
          if (!groomerData) continue;

          const status = appointmentData.status as AppointmentWithRelations['status'];
          if (!['pending', 'confirmed', 'completed', 'cancelled'].includes(status)) {
            console.error('Invalid appointment status:', status);
            continue;
          }

          const appointmentDate = toSafeDate(appointmentData.date);
          if (!appointmentDate) {
            console.error('Invalid appointment date:', appointmentDoc.id);
            continue;
          }

          const createdDate = toSafeDate(appointmentData.createdAt);
          if (!createdDate) {
            console.error('Invalid created date for appointment:', appointmentDoc.id);
            continue;
          }

          appointments.push({
            id: appointmentDoc.id,
            petId: appointmentData.petId as string,
            serviceId: appointmentData.serviceId as string,
            groomerId: appointmentData.groomerId as string,
            branchId: appointmentData.branchId as string,
            date: appointmentDate,
            status,
            notes: (appointmentData.notes as string | null) ?? null,
            productsUsed: (appointmentData.productsUsed as string | null) ?? null,
            createdAt: createdDate,
            updatedAt: toDateOrUndefined(appointmentData.updatedAt),
            pet: {
              name: petData.name as string,
              breed: petData.breed as string,
              image: (petData.image as string | null) ?? null
            },
            customer: {
              firstName: customerData.firstName as string,
              lastName: customerData.lastName as string
            },
            groomer: {
              name: groomerData.name as string
            }
          });
        } catch (error) {
          console.error('Error processing appointment update:', appointmentDoc.id, error);
          continue;
        }
      }
      
      queryClient.setQueryData(["appointments"], appointments);
    });

    return () => unsubscribe();
  }, [queryClient]);

  return {
    data,
    isLoading,
    error,
    addAppointment: addAppointmentMutation.mutateAsync,
  };
}
