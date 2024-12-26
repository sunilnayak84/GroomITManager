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
import { auth } from "../lib/firebase"; // Assuming auth object is available

interface FirestoreAppointmentData {
  petId: string;
  services: string[];
  groomerId: string;
  branchId: string;
  date: Timestamp;
  status: "pending" | "confirmed" | "completed" | "cancelled" | "in_progress";
  notes: string | null;
  productsUsed: string | null;
  totalPrice: number;
  totalDuration: number;
  createdAt: Timestamp;
  updatedAt: Timestamp | null;
  deletedAt: Timestamp | null;
  statusHistory?: { status: string; timestamp: Timestamp; updatedBy: string }[];
}

const timestampToISOString = (timestamp: Timestamp | string | null | undefined): string => {
  if (!timestamp) return new Date().toISOString();
  if (typeof timestamp === 'string') return new Date(timestamp).toISOString();
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
        if (!db) {
          throw new Error('Firebase not initialized');
        }

        const appointmentsRef = collection(db, 'appointments');
        const appointmentsQuery = query(
          appointmentsRef,
          where("deletedAt", "==", null)
        );

        // Fetch appointments, pets, and services in parallel
        const [appointmentsSnapshot, petsSnapshot, servicesSnapshot] = await Promise.all([
          getDocs(appointmentsQuery),
          getDocs(collection(db, 'pets')),
          getDocs(collection(db, 'services'))
        ]);

        // Create lookup maps for faster access
        const petsMap = new Map(petsSnapshot.docs.map(doc => [doc.id, doc.data()]));
        const servicesMap = new Map(servicesSnapshot.docs.map(doc => [doc.id, doc.data()]));
        
        if (appointmentsSnapshot.empty) {
          return [];
        }

        const appointments: AppointmentWithRelations[] = [];
        let successCount = 0;
        let errorCount = 0;

        await Promise.all(
          appointmentsSnapshot.docs.map(async (appointmentDoc) => {
            try {
              const rawData = appointmentDoc.data() as FirestoreAppointmentData;
              
              // Validate required fields
              if (!rawData) {
                console.error('FETCH_APPOINTMENTS: Missing raw data for appointment:', appointmentDoc.id);
                errorCount++;
                return null;
              }

              // Ensure petId exists and is a string
              const petId = rawData.petId ? String(rawData.petId) : null;
              if (!petId) {
                console.error('FETCH_APPOINTMENTS: Invalid petId for appointment:', appointmentDoc.id);
                errorCount++;
                return null;
              }

              const petDocRef = doc(db, 'pets', petId);
              const petDoc = await getDoc(petDocRef);
              if (!petDoc.exists()) {
                console.error('FETCH_APPOINTMENTS: Pet not found for appointment:', appointmentDoc.id);
                errorCount++;
                return null;
              }


            // Get pet data
            let petData = null;
            
            try {
              if (!rawData.petId) {
                throw new Error('Invalid pet ID');
              }
              
              if (!rawData.petId) {
                console.error('Missing petId for appointment:', appointmentDoc.id);
                return null;
              }

              try {
                const petDocRef = doc(db, 'pets', String(rawData.petId));
                const petDoc = await getDoc(petDocRef);
                
                if (petDoc.exists()) {
                const rawPetData = petDoc.data() as any;
                let customerData = null;
                
                try {
                  if (rawPetData.customerId) {
                    const customerDoc = await getDoc(doc(db, 'customers', rawPetData.customerId));
                    customerData = customerDoc.exists() ? customerDoc.data() : null;
                  }

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
                } catch (error) {
                  console.error('Error processing pet data:', error);
                }
              }
            } catch (error) {
              console.error('Error fetching pet doc:', error);
              return null;
            }
          } catch (error) {
            console.error('Error processing pet data:', error);
            return null;
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

            const groomerId = rawData.groomerId ? String(rawData.groomerId) : null;
            try {
              const groomerDoc = groomerId ? await getDoc(doc(db, 'users', groomerId)) : null;
              if (groomerDoc && groomerDoc.exists()) {
                const rawGroomerData = groomerDoc.data();
                groomerData = {
                  name: rawGroomerData.name || 'Unknown Groomer'
                };
              }
            } catch (error) {
              console.error('Error fetching groomer data:', error);
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

            // Get service data efficiently
            let serviceData = [];

            if (rawData.services && rawData.services.length > 0) {
              const serviceRefs = rawData.services.map(id => doc(db, 'services', id));
              const serviceDocs = await Promise.all(serviceRefs.map(ref => getDoc(ref)));
              
              serviceData = serviceDocs
                .filter(doc => doc.exists())
                .map(doc => {
                  const data = doc.data();
                  return {
                    name: data.name || 'Unknown Service',
                    duration: data.duration || 30,
                    price: data.price || 0,
                    description: data.description || null,
                    category: data.category || 'Service',
                    discount_percentage: data.discount_percentage || 0,
                    consumables: data.consumables || []
                  };
                });
            } else {
              console.log('FETCH_APPOINTMENTS: No serviceId provided for appointment');
            }

            const appointment: AppointmentWithRelations = {
              id: appointmentDoc.id,
              petId: rawData.petId,
              services: rawData.services,
              totalPrice: rawData.totalPrice,
              totalDuration: rawData.totalDuration,
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
            return appointment;
          } catch (error) {
            console.error('FETCH_APPOINTMENTS: Error processing appointment:', appointmentDoc.id, error);
            errorCount++;
            return null;
          }
        })
        );

        console.log(`FETCH_APPOINTMENTS: Processed ${appointmentsSnapshot.size} appointments. Success: ${successCount}, Errors: ${errorCount}`);
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
        
        // Combine date and time properly
        const [year, month, day] = appointmentData.date.split('-').map(Number);
        const [hours, minutes] = appointmentData.time.split(':').map(Number);
        const appointmentDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);
        appointmentData.date = appointmentDateTime.toISOString();
        
        // Get groomer data before saving
        const groomerDoc = await getDoc(doc(db, 'users', appointmentData.groomerId));
        const groomerData = groomerDoc.data();
        const groomerName = groomerData?.name || 'Unknown Groomer';

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

  const isTimeSlotAvailable = (date: Date, groomerId?: string, duration: number = 30, currentAppointmentId?: string): boolean => {
    if (!appointments) return true;
    
    // Convert input date to start of 15-min slot
    const slotStart = new Date(date);
    slotStart.setSeconds(0);
    slotStart.setMilliseconds(0);
    
    // Calculate end time based on service duration
    const slotEnd = new Date(slotStart);
    slotEnd.setMinutes(slotEnd.getMinutes() + duration);

    // Check if there are any overlapping appointments for the specified groomer
    const hasOverlap = appointments.some(appointment => {
      // Skip if appointment is soft deleted, being edited, cancelled, or groomer doesn't match
      if (
        appointment.deletedAt ||
        (currentAppointmentId && appointment.id === currentAppointmentId) || 
        appointment.status === 'cancelled' ||
        (groomerId && appointment.groomerId !== groomerId) ||
        !appointment.date // Skip if appointment has no date
      ) return false;
      
      const appointmentStart = new Date(appointment.date);
      const appointmentEnd = new Date(appointmentStart);
      appointmentEnd.setMinutes(appointmentEnd.getMinutes() + (appointment.totalDuration || 30));

      // For manual groomer selection, check specific groomer availability
      // For auto-assignment, server handles groomer selection
      if (!groomerId || (groomerId && appointment.groomerId === groomerId)) {
        const overlaps = (slotStart < appointmentEnd && slotEnd > appointmentStart);
        if (overlaps) {
          console.log('Appointment overlap detected:', {
            newAppointment: { start: slotStart, end: slotEnd, groomer: groomerId },
            existingAppointment: { id: appointment.id, start: appointmentStart, end: appointmentEnd, groomer: appointment.groomerId }
          });
          return overlaps;
        }
      }
      return overlaps;
    });

    // Check if groomer is available
    const groomerIsAvailable = !hasOverlap;

    return groomerIsAvailable;
  };

  const updateAppointmentMutation = useMutation({
    mutationFn: async (data: {
      id: string;
      status?: "pending" | "confirmed" | "in_progress" | "completed" | "cancelled";
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
        
        const currentData = appointmentSnap.data() as FirestoreAppointmentData;
        
        // Validate status transitions
        if (currentData.status === 'completed' || currentData.status === 'cancelled') {
          throw new Error('Completed or cancelled appointments cannot be modified');
        }
        
        if (currentData.status === 'in_progress' && 
            (data.status === 'pending' || data.status === 'confirmed')) {
          throw new Error('Appointments in progress cannot go back to pending or confirmed status');
        }

        const updateData = {
          ...currentData,
          status: data.status || currentData.status,
          updatedAt: Timestamp.fromDate(new Date()),
          notes: data.notes !== undefined ? data.notes : currentData.notes,
          cancellationReason: data.status === 'cancelled' ? data.cancellationReason : null,
          statusHistory: [
            ...(currentData.statusHistory || []),
            {
              status: data.status,
              timestamp: Timestamp.fromDate(new Date()),
              updatedBy: auth.currentUser?.uid || 'unknown'
            }
          ],
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