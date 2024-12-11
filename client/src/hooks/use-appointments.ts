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

// Helper function to convert Timestamp to Date string with error handling
const timestampToISOString = (timestamp: Timestamp | null | undefined): string => {
  if (!timestamp) return new Date().toISOString();
  try {
    return timestamp.toDate().toISOString();
  } catch (error) {
    console.error('Error converting timestamp:', error);
    return new Date().toISOString();
  }
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
        
        // Verify Firebase initialization
        if (!db) {
          console.error('FETCH_APPOINTMENTS: Firebase not initialized');
          throw new Error('Firebase not initialized');
        }

        // Get appointments collection
        const appointmentsRef = collection(db, 'appointments');
        console.log('FETCH_APPOINTMENTS: Created collection reference');

        // Create a query ordered by date
        const q = query(appointmentsRef);
        console.log('FETCH_APPOINTMENTS: Created query');

        const querySnapshot = await getDocs(q);
        console.log('FETCH_APPOINTMENTS: Got snapshot with', querySnapshot.size, 'documents');

        if (querySnapshot.empty) {
          console.log('FETCH_APPOINTMENTS: No appointments found');
          return [];
        }

        const appointments: AppointmentWithRelations[] = [];
        let successCount = 0;
        let errorCount = 0;

        for (const appointmentDoc of querySnapshot.docs) {
          try {
            console.log('FETCH_APPOINTMENTS: Processing appointment', appointmentDoc.id);
            const rawData = appointmentDoc.data();
            console.log('FETCH_APPOINTMENTS: Raw data for appointment', appointmentDoc.id, ':', rawData);
            
            // Type check the raw data
            if (!rawData || typeof rawData !== 'object') {
              console.error('FETCH_APPOINTMENTS: Invalid appointment data structure:', appointmentDoc.id);
              errorCount++;
              continue;
            }

            // Cast to our expected type
            const appointmentData = rawData as FirestoreAppointmentData;
            
            // Validate required fields
            if (!appointmentData.petId || !appointmentData.groomerId) {
              console.error('FETCH_APPOINTMENTS: Missing required fields in appointment:', appointmentDoc.id, appointmentData);
              errorCount++;
              continue;
            }

            // Get related documents
            console.log('FETCH_APPOINTMENTS: Fetching related documents for appointment:', appointmentDoc.id);
            
            try {
              // Get pet document
              const petDocRef = doc(db, 'pets', appointmentData.petId);
              console.log('FETCH_APPOINTMENTS: Fetching pet document:', appointmentData.petId);
              const petDoc = await getDoc(petDocRef);

              if (!petDoc.exists()) {
                console.error('FETCH_APPOINTMENTS: Pet not found:', appointmentData.petId);
                errorCount++;
                continue;
              }

              const petData = petDoc.data();
              console.log('FETCH_APPOINTMENTS: Pet data:', petData);

              // Get groomer document
              const groomerDocRef = doc(db, 'users', appointmentData.groomerId);
              console.log('FETCH_APPOINTMENTS: Fetching groomer document:', appointmentData.groomerId);
              const groomerDoc = await getDoc(groomerDocRef);

              if (!groomerDoc.exists()) {
                console.error('FETCH_APPOINTMENTS: Groomer not found:', appointmentData.groomerId);
                errorCount++;
                continue;
              }

              const groomerData = groomerDoc.data();
              console.log('FETCH_APPOINTMENTS: Groomer data:', groomerData);

              if (!petData || !groomerData) {
                console.error('FETCH_APPOINTMENTS: Missing data for pet or groomer:', {
                  appointmentId: appointmentDoc.id,
                  hasPetData: !!petData,
                  hasGroomerData: !!groomerData
                });
                errorCount++;
                continue;
              }

              // Get customer details
              if (!petData.customerId) {
                console.error('FETCH_APPOINTMENTS: Missing customerId for pet:', petData.id);
                errorCount++;
                continue;
              }

              console.log('FETCH_APPOINTMENTS: Fetching customer document:', petData.customerId);
              const customerDoc = await getDoc(doc(db, 'customers', petData.customerId));
              
              if (!customerDoc.exists()) {
                console.error('FETCH_APPOINTMENTS: Customer not found:', petData.customerId);
                errorCount++;
                continue;
              }

              const customerData = customerDoc.data();
              console.log('FETCH_APPOINTMENTS: Customer data:', customerData);

              if (!customerData) {
                console.error('FETCH_APPOINTMENTS: Missing customer data for pet:', petData.id);
                errorCount++;
                continue;
              }

              // Create the appointment object with all required data
              const appointment: AppointmentWithRelations = {
                id: appointmentDoc.id,
                petId: appointmentData.petId,
                serviceId: appointmentData.serviceId,
                groomerId: appointmentData.groomerId,
                branchId: appointmentData.branchId,
                date: timestampToISOString(appointmentData.date),
                status: appointmentData.status,
                notes: appointmentData.notes,
                productsUsed: appointmentData.productsUsed,
                createdAt: timestampToISOString(appointmentData.createdAt),
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
              successCount++;
              console.log('FETCH_APPOINTMENTS: Successfully processed appointment:', appointmentDoc.id);

            } catch (error) {
              console.error('FETCH_APPOINTMENTS: Error processing related data for appointment:', appointmentDoc.id, error);
              errorCount++;
              continue;
            }

          } catch (error) {
            console.error('FETCH_APPOINTMENTS: Error processing appointment:', appointmentDoc.id, error);
            errorCount++;
            continue;
          }
        }

        console.log(`FETCH_APPOINTMENTS: Processed ${querySnapshot.size} appointments. Success: ${successCount}, Errors: ${errorCount}`);

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

  return {
    data: appointments,
    isLoading,
    error,
    addAppointment: addAppointmentMutation.mutateAsync,
  };
}