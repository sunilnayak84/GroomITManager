import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { AppointmentWithRelations, InsertAppointment } from "@/lib/schema";
import { collection, getDocs, addDoc, onSnapshot, query, getDoc, doc, WithFieldValue, DocumentData } from 'firebase/firestore';
import { appointmentsCollection, petsCollection, customersCollection, usersCollection } from "../lib/firestore";
import React from "react";

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
        const appointmentData = appointmentDoc.data();
        if (!appointmentData) continue;

        try {
          // Get pet details
          const petDoc = await getDoc(doc(petsCollection, String(appointmentData.petId)));
          const petData = petDoc.data();
          if (!petData) continue;

          // Get customer details through pet's customerId
          const customerDoc = await getDoc(doc(customersCollection, String(petData.customerId)));
          const customerData = customerDoc.data();
          if (!customerData) continue;

          // Get groomer details
          const groomerDoc = await getDoc(doc(usersCollection, appointmentData.groomerId));
          const groomerData = groomerDoc.data();
          if (!groomerData) continue;

          const status = appointmentData.status as AppointmentWithRelations['status'];
          if (!['pending', 'confirmed', 'completed', 'cancelled'].includes(status)) {
            console.error('Invalid appointment status:', status);
            continue;
          }

          const createdDate = toSafeDate(appointmentData.createdAt);
          if (!createdDate) {
            console.error('Invalid created date for appointment:', appointmentDoc.id);
            continue;
          }

          const appointment: AppointmentWithRelations = {
            id: appointmentDoc.id,
            petId: Number(appointmentData.petId),
            serviceId: Number(appointmentData.serviceId),
            groomerId: appointmentData.groomerId,
            branchId: Number(appointmentData.branchId),
            date: toSafeDate(appointmentData.date) || new Date(),
            status,
            notes: appointmentData.notes ?? null,
            productsUsed: appointmentData.productsUsed ?? null,
            createdAt: createdDate,
            updatedAt: toDateOrUndefined(appointmentData.updatedAt),
            pet: {
              name: petData.name,
              breed: petData.breed,
              image: petData.image ?? null
            },
            customer: {
              firstName: customerData.firstName,
              lastName: customerData.lastName
            },
            groomer: {
              name: groomerData.name
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
      type AppointmentDocumentData = {
        petId: number;
        serviceId: number;
        groomerId: string;
        branchId: number;
        date: Date;
        status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
        notes: string | null;
        productsUsed: string | null;
        createdAt: Date;
      };

      // Convert input data to the correct types
      const baseData: AppointmentDocumentData = {
        petId: Number(appointmentData.petId),
        serviceId: Number(appointmentData.serviceId),
        groomerId: String(appointmentData.groomerId),
        branchId: Number(appointmentData.branchId),
        date: new Date(appointmentData.date),
        status: appointmentData.status || 'pending',
        notes: appointmentData.notes ?? null,
        productsUsed: appointmentData.productsUsed ?? null,
        createdAt: new Date()
      };

      // Add the document to Firestore
      const docRef = await addDoc(appointmentsCollection, baseData);
      
      // Construct the return data with the correct type
      const returnData = {
        id: docRef.id,
        petId: baseData.petId,
        serviceId: baseData.serviceId,
        groomerId: baseData.groomerId,
        branchId: baseData.branchId,
        date: baseData.date,
        status: baseData.status,
        notes: baseData.notes,
        productsUsed: baseData.productsUsed,
        createdAt: baseData.createdAt,
        updatedAt: undefined
      } satisfies Omit<AppointmentWithRelations, 'pet' | 'customer' | 'groomer'>;

      return returnData;
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
          const appointmentData = appointmentDoc.data();
          if (!appointmentData) continue;

          // Get pet details
          const petDoc = await getDoc(doc(petsCollection, String(appointmentData.petId)));
          const petData = petDoc.data();
          if (!petData) continue;

          // Get customer details
          const customerDoc = await getDoc(doc(customersCollection, String(petData.customerId)));
          const customerData = customerDoc.data();
          if (!customerData) continue;

          // Get groomer details
          const groomerDoc = await getDoc(doc(usersCollection, appointmentData.groomerId));
          const groomerData = groomerDoc.data();
          if (!groomerData) continue;

          const status = appointmentData.status as AppointmentWithRelations['status'];
          if (!['pending', 'confirmed', 'completed', 'cancelled'].includes(status)) {
            console.error('Invalid appointment status:', status);
            continue;
          }

          const createdDate = toSafeDate(appointmentData.createdAt);
          if (!createdDate) {
            console.error('Invalid created date for appointment:', appointmentDoc.id);
            continue;
          }

          appointments.push({
            id: appointmentDoc.id,
            petId: Number(appointmentData.petId),
            serviceId: Number(appointmentData.serviceId),
            groomerId: appointmentData.groomerId,
            branchId: Number(appointmentData.branchId),
            date: toSafeDate(appointmentData.date) || new Date(),
            status,
            notes: appointmentData.notes ?? null,
            productsUsed: appointmentData.productsUsed ?? null,
            createdAt: createdDate,
            updatedAt: toDateOrUndefined(appointmentData.updatedAt),
            pet: {
              name: petData.name,
              breed: petData.breed,
              image: petData.image ?? null
            },
            customer: {
              firstName: customerData.firstName,
              lastName: customerData.lastName
            },
            groomer: {
              name: groomerData.name
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