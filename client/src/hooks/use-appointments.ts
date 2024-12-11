import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { AppointmentWithRelations, InsertAppointment } from "@/lib/schema";
import { 
  collection, getDocs, setDoc, onSnapshot, query, getDoc, doc, 
  WithFieldValue, DocumentData, Timestamp, getFirestore,
  DocumentReference
} from 'firebase/firestore';
import { db } from "../lib/firebase";
import { useEffect } from "react";

interface FirestoreAppointmentData {
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
}

// Helper function to convert Timestamp to Date string
const timestampToISOString = (timestamp: Timestamp | null): string | null => {
  if (!timestamp) return null;
  return timestamp.toDate().toISOString();
};

// Helper to ensure type safety when creating Firestore data
const createFirestoreAppointmentData = (data: InsertAppointment): FirestoreAppointmentData => {
  const appointmentDate = new Date(data.date);
  if (isNaN(appointmentDate.getTime())) {
    throw new Error('Invalid appointment date');
  }
  
  return {
    petId: data.petId.toString(),
    serviceId: data.serviceId.toString(),
    groomerId: data.groomerId,
    branchId: data.branchId.toString(),
    date: Timestamp.fromDate(appointmentDate),
    status: data.status || 'pending',
    notes: data.notes || null,
    productsUsed: data.productsUsed || null,
    createdAt: Timestamp.fromDate(new Date()),
    updatedAt: null
  };
};

export function useAppointments() {
  const queryClient = useQueryClient();

  const { data: appointments, isLoading, error } = useQuery<AppointmentWithRelations[]>({
    queryKey: ["appointments"],
    queryFn: async () => {
      try {
        console.log('FETCH_APPOINTMENTS: Starting appointment fetch');
        if (!db) {
          console.error('FETCH_APPOINTMENTS: Firebase not initialized');
          throw new Error('Firebase not initialized');
        }
        const appointmentsRef = collection(db, 'appointments');
        const q = query(appointmentsRef);
        const querySnapshot = await getDocs(q);
        const appointments: AppointmentWithRelations[] = [];

        for (const appointmentDoc of querySnapshot.docs) {
          try {
            const appointmentData = appointmentDoc.data() as FirestoreAppointmentData;
            
            // Get related documents
            const [petDoc, groomerDoc] = await Promise.all([
              getDoc(doc(db, 'pets', appointmentData.petId)),
              getDoc(doc(db, 'users', appointmentData.groomerId))
            ]);

            const petData = petDoc.data();
            const groomerData = groomerDoc.data();

            if (!petData || !groomerData) {
              console.warn('Missing related data for appointment:', appointmentDoc.id);
              continue;
            }

            // Get customer details
            const customerDoc = await getDoc(doc(db, 'customers', petData.customerId));
            const customerData = customerDoc.data();

            if (!customerData) {
              console.warn('Missing customer data for pet:', petData.id);
              continue;
            }

            const appointment: AppointmentWithRelations = {
              id: appointmentDoc.id,
              petId: appointmentData.petId,
              serviceId: appointmentData.serviceId,
              groomerId: appointmentData.groomerId,
              branchId: appointmentData.branchId,
              date: timestampToISOString(appointmentData.date) || new Date().toISOString(),
              status: appointmentData.status,
              notes: appointmentData.notes,
              productsUsed: appointmentData.productsUsed,
              createdAt: timestampToISOString(appointmentData.createdAt) || new Date().toISOString(),
              updatedAt: timestampToISOString(appointmentData.updatedAt),
              pet: {
                name: petData.name,
                breed: petData.breed,
                image: petData.image || null
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

        console.log('FETCH_APPOINTMENTS: Successfully fetched', appointments.length, 'appointments');
        return appointments;
      } catch (error) {
        console.error('Error fetching appointments:', error);
        throw error;
      }
    }
  });

  const addAppointmentMutation = useMutation({
    mutationFn: async (appointmentData: InsertAppointment) => {
      try {
        console.log('Adding appointment with data:', appointmentData);
        const appointmentsRef = collection(db, 'appointments');
        const newAppointmentRef = doc(appointmentsRef);
        const dataToSave = createFirestoreAppointmentData(appointmentData);
        await setDoc(newAppointmentRef, dataToSave);
        return newAppointmentRef.id;
      } catch (error) {
        console.error('Error adding appointment:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    }
  });

  // Set up real-time updates
  useEffect(() => {
    const appointmentsRef = collection(db, 'appointments');
    const q = query(appointmentsRef);
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      try {
        const appointments: AppointmentWithRelations[] = [];
        
        for (const appointmentDoc of snapshot.docs) {
          try {
            const appointmentData = appointmentDoc.data() as FirestoreAppointmentData;
            
            // Get related documents
            const [petDoc, groomerDoc] = await Promise.all([
              getDoc(doc(db, 'pets', appointmentData.petId)),
              getDoc(doc(db, 'users', appointmentData.groomerId))
            ]);

            const petData = petDoc.data();
            const groomerData = groomerDoc.data();

            if (!petData || !groomerData) {
              console.warn('Missing related data for appointment:', appointmentDoc.id);
              continue;
            }

            // Get customer details
            const customerDoc = await getDoc(doc(db, 'customers', petData.customerId));
            const customerData = customerDoc.data();

            if (!customerData) {
              console.warn('Missing customer data for pet:', petData.id);
              continue;
            }

            appointments.push({
              id: appointmentDoc.id,
              petId: appointmentData.petId,
              serviceId: appointmentData.serviceId,
              groomerId: appointmentData.groomerId,
              branchId: appointmentData.branchId,
              date: timestampToISOString(appointmentData.date) || new Date().toISOString(),
              status: appointmentData.status,
              notes: appointmentData.notes,
              productsUsed: appointmentData.productsUsed,
              createdAt: timestampToISOString(appointmentData.createdAt) || new Date().toISOString(),
              updatedAt: timestampToISOString(appointmentData.updatedAt),
              pet: {
                name: petData.name,
                breed: petData.breed,
                image: petData.image || null
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
      } catch (error) {
        console.error('Error in snapshot listener:', error);
      }
    });

    return () => unsubscribe();
  }, [queryClient]);

  return {
    data: appointments,
    isLoading,
    error,
    addAppointment: addAppointmentMutation.mutateAsync,
  };
}