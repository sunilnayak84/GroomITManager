import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { AppointmentWithRelations, InsertAppointment } from "@/lib/schema";
import { 
  collection, getDocs, setDoc, doc, 
  Timestamp, getDoc
} from 'firebase/firestore';
import { db } from "../lib/firebase";

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

const timestampToISOString = (timestamp: Timestamp | null | undefined): string => {
  if (!timestamp) return new Date().toISOString();
  try {
    return timestamp.toDate().toISOString();
  } catch (error) {
    console.error('Error converting timestamp:', error);
    return new Date().toISOString();
  }
};

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
    status: data.status,
    notes: data.notes,
    productsUsed: data.productsUsed,
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
        console.log('FETCH_APPOINTMENTS: Created collection reference');

        const querySnapshot = await getDocs(appointmentsRef);
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
            const rawData = appointmentDoc.data() as FirestoreAppointmentData;
            
            if (!rawData.petId || !rawData.groomerId) {
              console.error('FETCH_APPOINTMENTS: Missing required fields in appointment:', appointmentDoc.id);
              errorCount++;
              continue;
            }

            // Get pet data
            const petDocRef = doc(db, 'pets', rawData.petId);
            const petDoc = await getDoc(petDocRef);
            
            let petData = {
              name: 'Unknown Pet',
              breed: 'Unknown Breed',
              image: null as string | null,
              customerId: 'unknown'
            };

            if (petDoc.exists()) {
              const rawPetData = petDoc.data();
              petData = {
                name: rawPetData.name || 'Unknown Pet',
                breed: rawPetData.breed || 'Unknown Breed',
                image: rawPetData.image || null,
                customerId: rawPetData.customerId || 'unknown'
              };
            }

            // Get groomer data
            let groomerData = {
              name: 'Unknown Groomer'
            };

            if (process.env.NODE_ENV !== 'development') {
              const groomerDoc = await getDoc(doc(db, 'users', rawData.groomerId));
              if (groomerDoc.exists()) {
                const rawGroomerData = groomerDoc.data();
                groomerData = {
                  name: rawGroomerData.name || 'Unknown Groomer'
                };
              }
            }

            // Get customer data
            let customerData = {
              firstName: 'Unknown',
              lastName: 'Customer'
            };

            if (process.env.NODE_ENV !== 'development' && petData.customerId !== 'unknown') {
              const customerDoc = await getDoc(doc(db, 'customers', petData.customerId));
              if (customerDoc.exists()) {
                const rawCustomerData = customerDoc.data();
                customerData = {
                  firstName: rawCustomerData.firstName || 'Unknown',
                  lastName: rawCustomerData.lastName || 'Customer'
                };
              }
            }

            const appointment: AppointmentWithRelations = {
              id: appointmentDoc.id,
              petId: rawData.petId,
              serviceId: rawData.serviceId,
              groomerId: rawData.groomerId,
              branchId: rawData.branchId,
              date: timestampToISOString(rawData.date),
              status: rawData.status,
              notes: rawData.notes,
              productsUsed: rawData.productsUsed,
              createdAt: timestampToISOString(rawData.createdAt),
              updatedAt: timestampToISOString(rawData.updatedAt),
              pet: {
                name: petData.name,
                breed: petData.breed,
                image: petData.image
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

          } catch (error) {
            console.error('FETCH_APPOINTMENTS: Error processing appointment:', appointmentDoc.id, error);
            errorCount++;
            continue;
          }
        }

        console.log(`FETCH_APPOINTMENTS: Processed ${querySnapshot.size} appointments. Success: ${successCount}, Errors: ${errorCount}`);
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