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
    petId: data.petId,
    serviceId: data.serviceId,
    groomerId: data.groomerId,
    branchId: data.branchId,
    date: Timestamp.fromDate(appointmentDate),
    status: 'pending',
    notes: data.notes || '',
    productsUsed: null,
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

            // Basic validation for required fields
            const requiredFields = ['petId', 'serviceId', 'date', 'status'];
            const missingFields = requiredFields.filter(field => !(field in rawData));
            if (missingFields.length > 0) {
              console.error(`FETCH_APPOINTMENTS: Missing fields in appointment ${appointmentDoc.id}:`, missingFields);
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

              // Initialize petData with development fallback
              let petData = null;
              if (petDoc.exists()) {
                const rawPetData = petDoc.data();
                petData = {
                  name: rawPetData.name,
                  breed: rawPetData.breed,
                  image: rawPetData.image,
                  customerId: rawPetData.customerId
                };
              }

              // In production, fetch real pet data
              if (process.env.NODE_ENV !== 'development') {
                if (!petDoc.exists()) {
                  console.error('FETCH_APPOINTMENTS: Pet not found:', appointmentData.petId);
                  errorCount++;
                  continue;
                }
                const rawPetData = petDoc.data();
                if (!rawPetData) {
                  console.error('FETCH_APPOINTMENTS: Invalid pet data for:', appointmentData.petId);
                  errorCount++;
                  continue;
                }
                petData = {
                  name: rawPetData.name || 'Unknown Pet',
                  breed: rawPetData.breed || 'Unknown Breed',
                  image: rawPetData.image || null,
                  customerId: rawPetData.customerId || 'unknown'
                };
              }
              
              console.log('FETCH_APPOINTMENTS: Pet data:', petData);

              // Try to get groomer document or use fallback in development
              let groomerData;
              if (process.env.NODE_ENV === 'development') {
                console.log('FETCH_APPOINTMENTS: Development mode - using fallback groomer data');
                groomerData = {
                  name: 'Development Groomer',
                  id: appointmentData.groomerId
                };
              } else {
                const userDocRef = doc(db, 'users', appointmentData.groomerId);
                const userDoc = await getDoc(userDocRef);
                
                if (userDoc.exists()) {
                  console.log('FETCH_APPOINTMENTS: Found groomer in users collection');
                  groomerData = userDoc.data();
                } else {
                  console.log('FETCH_APPOINTMENTS: Groomer not found in users, trying staff collection');
                  const staffDocRef = doc(db, 'staff', appointmentData.groomerId);
                  const staffDoc = await getDoc(staffDocRef);
                  
                  if (staffDoc.exists()) {
                    console.log('FETCH_APPOINTMENTS: Found groomer in staff collection');
                    groomerData = staffDoc.data();
                  } else {
                    console.error('FETCH_APPOINTMENTS: Groomer not found in any collection:', appointmentData.groomerId);
                    errorCount++;
                    continue;
                  }
                }
              }

              if (!groomerData) {
                console.error('FETCH_APPOINTMENTS: No groomer data found for ID:', appointmentData.groomerId);
                errorCount++;
                continue;
              }

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
              let customerData;
              if (process.env.NODE_ENV === 'development') {
                console.log('FETCH_APPOINTMENTS: Development mode - using fallback customer data');
                customerData = {
                  firstName: 'Test',
                  lastName: 'Customer',
                  email: 'test@example.com',
                  phone: '555-0123'
                };
              } else {
                if (!petData.customerId) {
                  console.error('FETCH_APPOINTMENTS: Missing customerId for pet:', appointmentData.petId);
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

                customerData = customerDoc.data();
                console.log('FETCH_APPOINTMENTS: Customer data:', customerData);

                if (!customerData) {
                  console.error('FETCH_APPOINTMENTS: Missing customer data for pet:', appointmentData.petId);
                  errorCount++;
                  continue;
                }
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