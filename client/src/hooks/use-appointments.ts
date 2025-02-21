import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from './use-user';
import type { AppointmentWithRelations, InsertAppointment, AppointmentImage } from "@/lib/schema";
import { 
  collection, doc, setDoc, getDoc, getDocs, query, 
  where, DocumentData, CollectionReference, runTransaction,
  QuerySnapshot, DocumentSnapshot, WithFieldValue, 
  FieldValue, serverTimestamp, Timestamp, updateDoc, arrayUnion
} from 'firebase/firestore';
import { db } from "../lib/firebase";

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
  cancellationReason?: "no_show" | "rescheduled" | "other" | null;
  beforeImage?: string | null;
  beforeImages: Array<{
    id: string;
    url: string;
    type: 'before';
    timestamp: Timestamp;
  }>;
  afterImages: Array<{
    id: string;
    url: string;
    type: 'after';
    timestamp: Timestamp;
  }>;
  observations?: string | null;
  recommendations?: string | null;
  inventoryUsage?: Array<{
    item_id: string;
    quantity_used: number;
    service_id: string;
    notes: string;
    service_linked: boolean;
    auto_deducted: boolean;
    service_name?: string;
  }>;
}

const timestampToISOString = (timestamp: Timestamp | null | undefined): string => {
  if (!timestamp) return new Date().toISOString();
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate().toISOString();
  }
  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }
  if (typeof timestamp === 'string') {
    return new Date(timestamp).toISOString();
  }
  return new Date().toISOString();
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
      productsUsed: data.productsUsed || null,
      totalPrice: data.totalPrice || 0,
      totalDuration: data.totalDuration || 30,
      createdAt: Timestamp.fromDate(new Date()),
      updatedAt: null,
      deletedAt: null,
      beforeImage: null,
      beforeImages: [],
      afterImages: [],
      observations: null,
      recommendations: null,
      cancellationReason: null
    };
  };

interface InventoryUsageData {
  item_id: string;
  quantity_used: number;
  service_id: string;
  notes: string;
  service_linked: boolean;
  auto_deducted: boolean;
  service_name: string;
}

export function useAppointments() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useUser();

  if (!currentUser) {
    throw new Error('Authentication required');
  }

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
              lastName: 'Customer'
            };

            if (petData.customerId !== 'unknown') {
              const customerDoc = await getDoc(doc(db, 'customers', petData.customerId));
              if (customerDoc.exists()) {
                const rawCustomerData = customerDoc.data();
                customerData = {
                  firstName: rawCustomerData.firstName || 'Unknown',
                  lastName: rawCustomerData.lastName || 'Customer'
                };
              } else {
                console.error('Customer not found for ID:', petData.customerId);
              }
            }

            // Get service data
            let serviceData = [];

            if (rawData.services && Array.isArray(rawData.services)) {
              console.log('FETCH_APPOINTMENTS: Processing services for appointment:', appointmentDoc.id, 'Services:', rawData.services);

              for (const serviceId of rawData.services) {
                if (!serviceId) {
                  console.error('FETCH_APPOINTMENTS: Invalid service ID in array');
                  continue;
                }

                console.log('FETCH_APPOINTMENTS: Fetching service data for ID:', serviceId);
                const serviceDoc = await getDoc(doc(db, 'services', serviceId));

                if (serviceDoc.exists()) {
                  const rawServiceData = serviceDoc.data();
                  console.log('FETCH_APPOINTMENTS: Raw service data for', serviceId, ':', rawServiceData);

                  if (!rawServiceData.name) {
                    console.error('FETCH_APPOINTMENTS: Service name missing for ID:', serviceId);
                  }

                  // Map all required service fields
                  const processedService = {
                    service_id: serviceId,
                    name: rawServiceData.name || 'Unknown Service',
                    duration: rawServiceData.duration || 30,
                    price: rawServiceData.price || 0,
                    description: rawServiceData.description || null,
                    category: rawServiceData.category || 'Service',
                    discount_percentage: rawServiceData.discount_percentage || 0,
                    consumables: rawServiceData.consumables || [],
                    selectedServices: rawServiceData.selectedServices || [],
                    selectedAddons: rawServiceData.selectedAddons || []
                  };

                  serviceData.push(processedService);
                  console.log('FETCH_APPOINTMENTS: Processed service:', processedService);
                } else {
                  console.error('FETCH_APPOINTMENTS: Service not found for ID:', serviceId);
                }
              }
            } else {
              console.warn('FETCH_APPOINTMENTS: No services array for appointment:', appointmentDoc.id);
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
              totalPrice: rawData.totalPrice || 0,
              totalDuration: rawData.totalDuration || 0,
              cancellationReason: rawData.cancellationReason || null,
              beforeImage: rawData.beforeImage || null,
              // Convert legacy single image to array format if it exists and no array exists
              beforeImages: rawData.beforeImages?.length ? rawData.beforeImages.map(img => ({
                id: img.id,
                url: img.url,
                type: img.type,
                timestamp: timestampToISOString(img.timestamp)
              })) : (rawData.beforeImage ? [{
                id: 'legacy',
                url: rawData.beforeImage,
                type: 'before',
                timestamp: timestampToISOString(rawData.updatedAt || rawData.createdAt)
              }] : []),
              afterImages: (rawData.afterImages || []).map(img => ({
                id: img.id,
                url: img.url,
                type: img.type,
                timestamp: timestampToISOString(img.timestamp)
              })),
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
              },
              service: serviceData.length > 0 ? serviceData : undefined,
              observations: rawData.observations,
              recommendations: rawData.recommendations,
              inventoryUsage: rawData.inventoryUsage?.map(usage => ({
                item_id: usage.item_id,
                quantity_used: usage.quantity_used,
                service_id: usage.service_id,
                notes: usage.notes || '',
                service_linked: usage.service_linked,
                auto_deducted: usage.auto_deducted,
                service_name: usage.service_name || ''
              }))
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

  const isTimeSlotAvailable = (date: Date, groomerId: string, duration: number = 60): boolean => {
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
      // Skip if not the same groomer or if appointment is cancelled
      if (appointment.groomerId !== groomerId || appointment.status === 'cancelled') return false;

      const appointmentStart = new Date(appointment.date);
      const appointmentEnd = new Date(appointmentStart);
      // Use the existing appointment's service duration, default to 60 minutes
      const appointmentDuration = appointment.service?.[0]?.duration || 60; // Changed to handle array of services
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
    mutationFn: async ({ 
      id, 
      status, 
      cancellationReason, 
      notes,
      groomerId,
      services,
      date,
      beforeImage,
      beforeImages,
      afterImages,
      observations,
      recommendations,
      inventoryUsageData
    }: { 
      id: string; 
      status: "pending" | "confirmed" | "in_progress" | "completed" | "cancelled";
      cancellationReason?: "no_show" | "rescheduled" | "other" | null;
      notes?: string | null;
      groomerId?: string;
      services?: string[];
      date?: string;
      beforeImage?: string | null;
      beforeImages?: AppointmentImage[];
      afterImages?: AppointmentImage[];
      observations?: string | null;
      recommendations?: string | null;
      inventoryUsageData?: Array<{
        item_id: string;
        quantity_used: number;
        service_id: string;
        notes: string;
        service_linked: boolean;
        auto_deducted: boolean;
        service_name: string;
      }>;
    }) => {
      try {
        console.log('Updating appointment:', { id, status, cancellationReason, notes, beforeImages, afterImages, observations, recommendations, inventoryUsageData });
        const appointmentRef = doc(db, 'appointments', id);

        // Create update object with only defined fields
        const updateData: Partial<FirestoreAppointmentData> = {
          status,
          updatedAt: Timestamp.fromDate(new Date()),
          inventoryUsage: inventoryUsageData || []
        };

        // Only add fields that are explicitly provided (not undefined)
        if (cancellationReason !== undefined) {
          updateData.cancellationReason = cancellationReason;
        }
        if (notes !== undefined) {
          updateData.notes = notes;
        }
        if (groomerId !== undefined) {
          updateData.groomerId = groomerId;
        }
        if (services !== undefined) {
          updateData.services = services;
        }
        if (date !== undefined) {
          updateData.date = Timestamp.fromDate(new Date(date));
        }
        if (observations !== undefined) {
          updateData.observations = observations;
        }
        if (recommendations !== undefined) {
          updateData.recommendations = recommendations;
        }
        if (updateData.inventoryUsage) {
          updateData.inventoryUsage = updateData.inventoryUsage.map(usage => ({
            item_id: usage.item_id,
            quantity_used: usage.quantity_used,
            service_id: usage.service_id,
            notes: usage.notes || '',
            service_linked: usage.service_linked,
            auto_deducted: usage.auto_deducted,
            service_name: usage.service_name || ''
          }));
        }
        if (beforeImages !== undefined) {
          updateData.beforeImages = beforeImages.map(img => ({
            id: img.id,
            url: img.url,
            type: 'before' as const,
            timestamp: Timestamp.fromDate(new Date(img.timestamp))
          }));
        }
        if (afterImages !== undefined) {
          updateData.afterImages = afterImages.map(img => ({
            id: img.id,
            url: img.url,
            type: 'after' as const,
            timestamp: Timestamp.fromDate(new Date(img.timestamp))
          }));
        }

        // Use updateDoc instead of setDoc to only update specified fields
        // If appointment is being marked as completed, handle loyalty points
        if (status === 'completed') {
          try {
            // Get the appointment to access total price
            const appointmentRef = doc(db, 'appointments', id);
            const appointmentSnap = await getDoc(appointmentRef);
            const appointmentData = appointmentSnap.data();

            if (appointmentData) {
              // Get loyalty program settings
              const loyaltyConfigRef = doc(db, 'settings', 'loyalty');
              const loyaltyConfigSnap = await getDoc(loyaltyConfigRef);
              const loyaltyConfig = loyaltyConfigSnap.data();

              if (loyaltyConfig && appointmentData.totalPrice) {
                // Calculate earned points
                const earnedPoints = Math.floor(appointmentData.totalPrice * (loyaltyConfig.pointsPerSpend || 1));

                // Get pet's customer
                const petRef = doc(db, 'pets', appointmentData.petId);
                const petSnap = await getDoc(petRef);
                const petData = petSnap.data();

                if (petData?.customerId) {
                  // Update customer's loyalty points
                  const customerRef = doc(db, 'customers', petData.customerId);
                  const customerSnap = await getDoc(customerRef);
                  const customerData = customerSnap.data();

                  if (customerData) {
                    // Add points history entry
                    const pointsEntry = {
                      points: earnedPoints,
                      type: "earned",
                      source: "appointment",
                      timestamp: new Date().toISOString()
                    };

                    // Update customer document - let backend calculate tier
                    await updateDoc(customerRef, {
                      pointsHistory: arrayUnion(pointsEntry),
                      updatedAt: Timestamp.fromDate(new Date())
                    });
                  }
                }
              }
            }
          } catch (error) {
            console.error('Error updating loyalty points:', error);
          }
        }
        await updateDoc(appointmentRef, updateData);
        console.log('Appointment updated successfully:', updateData);
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

  const fetchAppointments = () => {
    queryClient.refetchQueries({ queryKey: ["appointments"] });
  };

  return {
    data: appointments,
    isLoading,
    error,
    refetch: fetchAppointments,
    addAppointment: addAppointmentMutation.mutateAsync,
    updateAppointment: updateAppointmentMutation.mutateAsync,
    deleteAppointment: deleteAppointmentMutation.mutateAsync,
    isTimeSlotAvailable,
  };
}