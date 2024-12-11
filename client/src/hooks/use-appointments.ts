import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { AppointmentWithRelations, InsertAppointment, Appointment } from "@/lib/schema";
import { 
  collection, getDocs, setDoc, onSnapshot, query, getDoc, doc, 
  WithFieldValue, DocumentData, Timestamp, FieldValue, getFirestore,
  FirestoreDataConverter
} from 'firebase/firestore';
import { appointmentsCollection, petsCollection, customersCollection, usersCollection } from "../lib/firestore";
import React from "react";

type FirestoreAppointmentData = {
  id: string;
  petId: string;
  serviceId: string;
  groomerId: string;
  branchId: string;
  date: Timestamp;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  notes: string | null;
  productsUsed: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp | null;
};

// Firestore converter for appointments
const appointmentConverter: FirestoreDataConverter<FirestoreAppointmentData> = {
  toFirestore(appointment: WithFieldValue<FirestoreAppointmentData>): DocumentData {
    return {
      petId: appointment.petId,
      serviceId: appointment.serviceId,
      groomerId: appointment.groomerId,
      branchId: appointment.branchId,
      date: Timestamp.fromDate(new Date()),
      status: appointment.status,
      notes: appointment.notes,
      productsUsed: appointment.productsUsed,
      createdAt: Timestamp.fromDate(new Date()),
      updatedAt: null
    };
  },
  fromFirestore(snapshot: any, options: any): FirestoreAppointmentData {
    const data = snapshot.data(options);
    return {
      id: snapshot.id,
      petId: data.petId,
      serviceId: data.serviceId,
      groomerId: data.groomerId,
      branchId: data.branchId,
      date: data.date,
      status: data.status,
      notes: data.notes || null,
      productsUsed: data.productsUsed || null,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt || null
    };
  }
};

// Helper to ensure type safety when creating Firestore data
const createFirestoreAppointmentData = (data: InsertAppointment): WithFieldValue<DocumentData> => ({
  id: doc(appointmentsCollection).id,
  petId: data.petId.toString(),
  serviceId: data.serviceId.toString(),
  groomerId: data.groomerId,
  branchId: data.branchId.toString(),
  date: Timestamp.fromDate(new Date(data.date)),
  status: data.status || 'pending',
  notes: data.notes,
  productsUsed: data.productsUsed,
  createdAt: Timestamp.fromDate(new Date()),
  updatedAt: null
});

// Helper function to convert Timestamp or string to Date
const toDate = (value: Timestamp | string | null): Date | null => {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate();
  try {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
};

export function useAppointments() {
  const queryClient = useQueryClient();
  const db = getFirestore();

  const { data: appointments, isLoading, error } = useQuery<AppointmentWithRelations[]>({
    queryKey: ["appointments"],
    queryFn: async () => {
      console.log('FETCH_APPOINTMENTS: Starting appointment fetch');
      const db = getFirestore();
      const appointmentsRef = collection(db, 'appointments').withConverter(appointmentConverter);
      const querySnapshot = await getDocs(appointmentsRef);
      const appointments: AppointmentWithRelations[] = [];
      console.log('FETCH_APPOINTMENTS: Found', querySnapshot.size, 'appointments');

      for (const appointmentDoc of querySnapshot.docs) {
        const appointmentData = appointmentDoc.data() as FirestoreAppointmentData;
        console.log('FETCH_APPOINTMENTS: Processing appointment:', appointmentDoc.id, appointmentData);
        
        if (!appointmentData) {
          console.log('FETCH_APPOINTMENTS: No data for appointment:', appointmentDoc.id);
          continue;
        }

        try {
          // Get pet details
          const petDocRef = doc(db, 'pets', appointmentData.petId);
          const petDoc = await getDoc(petDocRef);
          const petData = petDoc.data();
          if (!petData) {
            console.log('FETCH_APPOINTMENTS: No pet data found for:', appointmentData.petId);
            continue;
          }

          // Get customer details through pet's customerId
          const customerDocRef = doc(db, 'customers', petData.customerId as string);
          const customerDoc = await getDoc(customerDocRef);
          const customerData = customerDoc.data();
          if (!customerData) {
            console.log('FETCH_APPOINTMENTS: No customer data found for:', petData.customerId);
            continue;
          }

          // Get groomer details
          const groomerDocRef = doc(db, 'users', appointmentData.groomerId);
          const groomerDoc = await getDoc(groomerDocRef);
          const groomerData = groomerDoc.data();
          if (!groomerData) {
            console.log('FETCH_APPOINTMENTS: No groomer data found for:', appointmentData.groomerId);
            continue;
          }

          // Validate status
          const status = appointmentData.status;
          if (!['pending', 'confirmed', 'completed', 'cancelled'].includes(status)) {
            console.error('FETCH_APPOINTMENTS: Invalid status:', status, 'for appointment:', appointmentDoc.id);
            continue;
          }

          // Convert dates
          const appointmentDate = toDate(appointmentData.date);
          const createdDate = toDate(appointmentData.createdAt);
          const updatedDate = appointmentData.updatedAt ? toDate(appointmentData.updatedAt) : null;

          if (!appointmentDate || !createdDate) {
            console.error('FETCH_APPOINTMENTS: Invalid dates for appointment:', appointmentDoc.id);
            continue;
          }

          const appointment: AppointmentWithRelations = {
            id: appointmentDoc.id,
            petId: appointmentData.petId,
            serviceId: appointmentData.serviceId,
            groomerId: appointmentData.groomerId,
            branchId: appointmentData.branchId,
            date: appointmentDate.toISOString(),
            status,
            notes: appointmentData.notes,
            productsUsed: appointmentData.productsUsed,
            createdAt: createdDate.toISOString(),
            updatedAt: updatedDate?.toISOString() ?? null,
            pet: {
              name: petData.name as string,
              breed: petData.breed as string,
              image: petData.image as string | null
            },
            customer: {
              firstName: customerData.firstName as string,
              lastName: customerData.lastName as string
            },
            groomer: {
              name: groomerData.name as string
            }
          };

          console.log('FETCH_APPOINTMENTS: Successfully processed appointment:', appointment);
          appointments.push(appointment);
        } catch (error) {
          console.error('FETCH_APPOINTMENTS: Error processing appointment:', appointmentDoc.id, error);
          continue;
        }
      }

      console.log('FETCH_APPOINTMENTS: Returning', appointments.length, 'appointments');
      return appointments;
    },
  });

  const addAppointmentMutation = useMutation({
    mutationFn: async (appointmentData: InsertAppointment): Promise<void> => {
      try {
        console.log('Adding appointment with data:', appointmentData);
        const docRef = doc(appointmentsCollection);
        const dataToSave = createFirestoreAppointmentData(appointmentData);
        
        console.log('Prepared Firestore data:', dataToSave);
        await setDoc(docRef, dataToSave);
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
    console.log('APPOINTMENTS_REALTIME: Setting up real-time updates');
    const q = query(appointmentsCollection);
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      console.log('APPOINTMENTS_REALTIME: Received update with', snapshot.docs.length, 'appointments');
      const appointments: AppointmentWithRelations[] = [];
      
      for (const appointmentDoc of snapshot.docs) {
        const appointmentData = appointmentDoc.data() as FirestoreAppointmentData;
        console.log('APPOINTMENTS_REALTIME: Processing appointment:', appointmentDoc.id, appointmentData);
        
        try {
          // Get pet details
          const petDocRef = doc(db, 'pets', appointmentData.petId);
          const petDoc = await getDoc(petDocRef);
          const petData = petDoc.data();
          if (!petData) {
            console.log('APPOINTMENTS_REALTIME: No pet data found for:', appointmentData.petId);
            continue;
          }

          // Get customer details through pet's customerId
          const customerDocRef = doc(db, 'customers', petData.customerId as string);
          const customerDoc = await getDoc(customerDocRef);
          const customerData = customerDoc.data();
          if (!customerData) {
            console.log('APPOINTMENTS_REALTIME: No customer data found for:', petData.customerId);
            continue;
          }

          // Get groomer details
          const groomerDocRef = doc(db, 'users', appointmentData.groomerId);
          const groomerDoc = await getDoc(groomerDocRef);
          const groomerData = groomerDoc.data();
          if (!groomerData) {
            console.log('APPOINTMENTS_REALTIME: No groomer data found for:', appointmentData.groomerId);
            continue;
          }

          // Convert dates
          const appointmentDate = toDate(appointmentData.date);
          const createdDate = toDate(appointmentData.createdAt);
          const updatedDate = appointmentData.updatedAt ? toDate(appointmentData.updatedAt) : null;

          if (!appointmentDate || !createdDate) {
            console.error('APPOINTMENTS_REALTIME: Invalid dates for appointment:', appointmentDoc.id);
            continue;
          }

          const appointment: AppointmentWithRelations = {
            id: appointmentDoc.id,
            petId: appointmentData.petId,
            serviceId: appointmentData.serviceId,
            groomerId: appointmentData.groomerId,
            branchId: appointmentData.branchId,
            date: appointmentDate.toISOString(),
            status: appointmentData.status,
            notes: appointmentData.notes,
            productsUsed: appointmentData.productsUsed,
            createdAt: createdDate.toISOString(),
            updatedAt: updatedDate?.toISOString() ?? null,
            pet: {
              name: petData.name as string,
              breed: petData.breed as string,
              image: petData.image as string | null
            },
            customer: {
              firstName: customerData.firstName as string,
              lastName: customerData.lastName as string
            },
            groomer: {
              name: groomerData.name as string
            }
          };

          console.log('APPOINTMENTS_REALTIME: Successfully processed appointment:', appointment);
          appointments.push(appointment);
        } catch (error) {
          console.error('APPOINTMENTS_REALTIME: Error processing appointment update:', appointmentDoc.id, error);
          continue;
        }
      }
      
      console.log('APPOINTMENTS_REALTIME: Updating query cache with', appointments.length, 'appointments');
      queryClient.setQueryData(["appointments"], appointments);
    });

    return () => {
      console.log('APPOINTMENTS_REALTIME: Cleaning up real-time subscription');
      unsubscribe();
    };
  }, [queryClient, db]);

  return {
    data: appointments,
    isLoading,
    error,
    addAppointment: addAppointmentMutation.mutateAsync,
  };
}