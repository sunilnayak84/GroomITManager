import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { AppointmentWithRelations, InsertAppointment } from "@/lib/schema";
import { 
  collection, doc, setDoc, getDoc, getDocs, query, 
  where, DocumentData, CollectionReference, runTransaction,
  QuerySnapshot, DocumentSnapshot, WithFieldValue, 
  FieldValue, serverTimestamp, Timestamp
} from 'firebase/firestore';
import { db } from "../lib/firebase";
import { timestampToString } from "../lib/types";

interface FirestoreAppointmentData {
  petId: string;
  services: string[];
  groomerId: string;
  branchId: string;
  date: Timestamp;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  notes: string | null;
  productsUsed: string | null;
  totalPrice: number;
  totalDuration: number;
  createdAt: Timestamp;
  updatedAt: Timestamp | null;
  deletedAt: Timestamp | null;
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
      services: data.services,
      groomerId: data.groomerId,
      branchId: data.branchId,
      date: Timestamp.fromDate(appointmentDate),
      status: data.status,
      notes: data.notes,
      productsUsed: data.productsUsed,
      totalPrice: data.totalPrice || 0,
      totalDuration: data.totalDuration || 30,
      createdAt: Timestamp.fromDate(new Date()),
      updatedAt: null,
      deletedAt: null
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

        // Only fetch non-deleted appointments
        console.log('FETCH_APPOINTMENTS: Creating query for non-deleted appointments');
        // Create query for active (non-deleted) appointments
        const appointmentsQuery = query(
          appointmentsRef,
          where("deletedAt", "==", null)
        );

        // Get all active appointments
        const querySnapshot = await getDocs(appointmentsQuery);
        console.log('FETCH_APPOINTMENTS: Found', querySnapshot.size, 'active appointments');
        
        // Debug: Log all appointments
        querySnapshot.forEach(doc => {
          console.log('FETCH_APPOINTMENTS: Active appointment:', doc.id, doc.data());
        });
        console.log('FETCH_APPOINTMENTS: Got snapshot with', querySnapshot.size, 'active documents');

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
            
            let petData = null;

            if (petDoc.exists()) {
              const rawPetData = petDoc.data() as any;
              const customerDoc = await getDoc(doc(db, 'customers', rawPetData.customerId));
              const customerData = customerDoc.exists() ? customerDoc.data() : null;

              petData = {
                id: rawPetData.id || rawData.petId,
                firebaseId: rawPetData.firebaseId,
                name: rawPetData.name,
                type: rawPetData.type || 'dog',
                breed: rawPetData.breed,
                customerId: rawPetData.customerId,
                dateOfBirth: rawPetData.dateOfBirth,
                age: rawPetData.age,
                gender: rawPetData.gender,
                weight: rawPetData.weight,
                weightUnit: rawPetData.weightUnit || 'kg',
                notes: rawPetData.notes,
                image: rawPetData.image,
                createdAt: timestampToString(rawPetData.createdAt),
                updatedAt: timestampToString(rawPetData.updatedAt),
                owner: customerData ? {
                  id: rawPetData.customerId,
                  name: `${customerData.firstName} ${customerData.lastName}`,
                  email: customerData.email
                } : null
              };
            }

            if (!petData) {
              petData = {
                id: rawData.petId,
                firebaseId: null,
                name: 'Unknown Pet',
                type: 'dog',
                breed: 'Unknown Breed',
                customerId: 'unknown',
                dateOfBirth: null,
                age: null,
                gender: null,
                weight: null,
                weightUnit: 'kg',
                notes: null,
                image: null,
                createdAt: new Date().toISOString(),
                updatedAt: null,
                owner: null
              };
            }

            // Get groomer data
            let groomerData = {
              name: 'Unknown Groomer'
            };

            const groomerDoc = await getDoc(doc(db, 'users', rawData.groomerId));
            if (groomerDoc.exists()) {
              const rawGroomerData = groomerDoc.data();
              groomerData = {
                name: rawGroomerData.name || 'Unknown Groomer'
              };
            } else {
              console.error('Groomer not found for ID:', rawData.groomerId);
            }

            // Get customer data
            let customerData = {
              firstName: 'Unknown',
              lastName: 'Customer',
              email: null,
              phone: null,
              address: null,
              gender: null,
              petCount: 0
            };

            if (petData.customerId !== 'unknown') {
              const customerDoc = await getDoc(doc(db, 'customers', petData.customerId));
              if (customerDoc.exists()) {
                const rawCustomerData = customerDoc.data();
                customerData = {
                  firstName: rawCustomerData.firstName || 'Unknown',
                  lastName: rawCustomerData.lastName || 'Customer',
                  email: rawCustomerData.email || null,
                  phone: rawCustomerData.phone || null,
                  address: rawCustomerData.address || null,
                  gender: rawCustomerData.gender || null,
                  petCount: rawCustomerData.petCount || 0
                };
              } else {
                console.error('Customer not found for ID:', petData.customerId);
              }
            }

            // Get service data
            let serviceData = [];

            if (rawData.services) {
              for (const serviceId of rawData.services) {
                console.log('FETCH_APPOINTMENTS: Fetching service data for ID:', serviceId);
                const serviceDoc = await getDoc(doc(db, 'services', serviceId));
                
                if (serviceDoc.exists()) {
                  const rawServiceData = serviceDoc.data();
                  console.log('FETCH_APPOINTMENTS: Raw service data:', rawServiceData);
                  
                  // Map all required service fields
                  serviceData.push({
                    name: rawServiceData.name || 'Unknown Service',
                    duration: rawServiceData.duration || 30,
                    price: rawServiceData.price || 0,
                    description: rawServiceData.description || null,
                    category: rawServiceData.category || 'Service',
                    discount_percentage: rawServiceData.discount_percentage || 0,
                    consumables: rawServiceData.consumables || []
                  });
                  console.log('FETCH_APPOINTMENTS: Processed service data:', serviceData);
                } else {
                  console.error('FETCH_APPOINTMENTS: Service not found for ID:', serviceId);
                }
              }
            } else {
              console.log('FETCH_APPOINTMENTS: No serviceId provided for appointment');
            }

            const appointment: AppointmentWithRelations = {
              id: appointmentDoc.id,
              petId: rawData.petId,
              services: rawData.services,
              groomerId: rawData.groomerId,
              branchId: rawData.branchId,
              date: timestampToISOString(rawData.date),
              status: rawData.status,
              notes: rawData.notes,
              productsUsed: rawData.productsUsed,
              createdAt: timestampToISOString(rawData.createdAt),
              updatedAt: timestampToISOString(rawData.updatedAt),
              pet: {
                ...petData,
                createdAt: petData.createdAt || new Date().toISOString(),
                updatedAt: petData.updatedAt || null,
              },
              customer: customerData,
              groomer: {
                name: groomerData.name
              },
              service: serviceData
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

  const isTimeSlotAvailable = (date: Date, groomerId: string, duration: number = 30, currentAppointmentId?: string): boolean => {
    if (!appointments) return true;
    
    // Convert input date to start of 15-min slot
    const slotStart = new Date(date);
    slotStart.setSeconds(0);
    slotStart.setMilliseconds(0);
    
    // Calculate end time based on service duration
    const slotEnd = new Date(slotStart);
    slotEnd.setMinutes(slotEnd.getMinutes() + duration);

    // Check if there are any overlapping appointments
    const hasOverlap = appointments.some(appointment => {
      // Skip if this is the appointment being edited or if appointment is cancelled
      if (
        (currentAppointmentId && appointment.id === currentAppointmentId) || 
        appointment.groomerId !== groomerId || 
        appointment.status === 'cancelled'
      ) return false;
      
      const appointmentStart = new Date(appointment.date);
      const appointmentEnd = new Date(appointmentStart);
      const appointmentDuration = appointment.totalDuration || 30;
      appointmentEnd.setMinutes(appointmentEnd.getMinutes() + appointmentDuration);

      // Check if the new appointment overlaps with existing appointment
      // An overlap occurs if either:
      // 1. New appointment starts during existing appointment
      // 2. New appointment ends during existing appointment
      // 3. New appointment completely contains existing appointment
      // 4. Existing appointment completely contains new appointment
      const overlaps = (
        (slotStart >= appointmentStart && slotStart < appointmentEnd) ||
        (slotEnd > appointmentStart && slotEnd <= appointmentEnd) ||
        (slotStart <= appointmentStart && slotEnd >= appointmentEnd) ||
        (appointmentStart <= slotStart && appointmentEnd >= slotEnd)
      );

      if (overlaps) {
        console.log('Appointment overlap found:', {
          newAppointment: {
            start: slotStart.toISOString(),
            end: slotEnd.toISOString(),
            duration
          },
          existingAppointment: {
            id: appointment.id,
            start: appointmentStart.toISOString(),
            end: appointmentEnd.toISOString(),
            duration: appointmentDuration,
            status: appointment.status
          }
        });
      }

      if (overlaps) {
        console.log('Appointment overlap detected:', {
          newAppointment: {
            start: slotStart.toISOString(),
            end: slotEnd.toISOString(),
            duration,
            groomer: groomerId
          },
          existingAppointment: {
            id: appointment.id,
            start: appointmentStart.toISOString(),
            end: appointmentEnd.toISOString(),
            duration: appointmentDuration,
            groomer: appointment.groomerId,
            status: appointment.status
          }
        });
      }

      return overlaps;
    });

    return !hasOverlap;
  };

  const updateAppointmentMutation = useMutation({
    mutationFn: async (data: {
      id: string;
      status?: "pending" | "confirmed" | "completed" | "cancelled";
      cancellationReason?: string;
      notes?: string;
      services?: string[];
      groomerId?: string;
      date?: Date;
      totalDuration?: number;
      totalPrice?: number;
    }) => {
      try {
        console.log('Updating appointment:', data);
        const appointmentRef = doc(db, 'appointments', data.id);
        
        // Get current appointment data
        const appointmentSnap = await getDoc(appointmentRef);
        if (!appointmentSnap.exists()) {
          throw new Error('Appointment not found');
        }

        const currentData = appointmentSnap.data();
        const updateData = {
          ...currentData,
          status: data.status || currentData.status,
          updatedAt: Timestamp.fromDate(new Date()),
          notes: data.notes !== undefined ? data.notes : currentData.notes,
          cancellationReason: data.status === 'cancelled' ? data.cancellationReason : null,
          services: data.services || currentData.services,
          groomerId: data.groomerId || currentData.groomerId,
          date: data.date ? Timestamp.fromDate(data.date) : currentData.date,
          totalDuration: data.totalDuration || currentData.totalDuration,
          totalPrice: data.totalPrice || currentData.totalPrice
        };

        await setDoc(appointmentRef, updateData, { merge: true });
        console.log('Appointment updated successfully');
        return true;
      } catch (error) {
        console.error('Error updating appointment:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    }
  });

  const deleteAppointmentMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      try {
        console.log('Soft deleting appointment:', appointmentId);
        const appointmentRef = doc(db, 'appointments', appointmentId);
        
        // Get current appointment data
        const appointmentSnap = await getDoc(appointmentRef);
        if (!appointmentSnap.exists()) {
          throw new Error('Appointment not found');
        }

        const currentData = appointmentSnap.data();
        const updateData = {
          ...currentData,
          deletedAt: Timestamp.fromDate(new Date()),
          updatedAt: Timestamp.fromDate(new Date())
        };

        await setDoc(appointmentRef, updateData);
        console.log('Appointment soft deleted successfully');
        return true;
      } catch (error) {
        console.error('Error soft deleting appointment:', error);
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
    updateAppointment: updateAppointmentMutation.mutateAsync,
    deleteAppointment: deleteAppointmentMutation.mutateAsync,
    isTimeSlotAvailable,
  };
}