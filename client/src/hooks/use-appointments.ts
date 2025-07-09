import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from './use-user';
import { 
  collection, doc, setDoc, getDoc, getDocs, query, 
  where, DocumentData, CollectionReference, runTransaction,
  QuerySnapshot, DocumentSnapshot, WithFieldValue, 
  FieldValue, serverTimestamp, Timestamp, updateDoc, arrayUnion
} from 'firebase/firestore';
import { db } from "../lib/firebase";
import type { AppointmentImage, InsertAppointment } from "@/lib/schema";

// Define the missing types
type CustomerData = {
  firstName: string;
  lastName: string;
};

type GroomerData = {
  name: string;
};

type PetData = {
  name: string;
  breed: string;
  image: string | null;
};

type ServiceData = {
  service_id: string;
  name: string;
  duration: number;
  price: number;
  description: string | null;
  category: string;
  discount_percentage: number;
  consumables: string[];
  selectedServices?: Array<{
    consumables?: string[];
  }>;
  selectedAddons?: Array<{
    consumables?: string[];
  }>;
};

interface AppointmentData {
  id: string;
  petId: string;
  services: string[];
  groomerId: string;
  branchId: string;
  date: string;
  status: "pending" | "confirmed" | "in_progress" | "completed" | "cancelled";
  notes: string | null;
  productsUsed: string | null;
  totalPrice: number;
  totalDuration: number;
  createdAt: string;
  updatedAt: string | null;
  cancellationReason?: "no_show" | "rescheduled" | "other" | null;
  beforeImage?: string | null;
  beforeImages: AppointmentImage[];
  afterImages: AppointmentImage[];
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
  billId?: string;
  billStatus?: string;
}

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
  billId?: string;
  billStatus?: string;
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

    const appointmentData: FirestoreAppointmentData = {
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

    // Only add billId if it's defined
    if (data.billId) {
      appointmentData.billId = data.billId;
    }

    return appointmentData;
  };

export interface AppointmentWithRelations extends AppointmentData {
  customer?: CustomerData;
  groomer?: GroomerData;
  pet?: PetData;
  service?: ServiceData[];
  allServices?: ServiceData[];
  paymentStatus?: 'paid' | 'pending';
  billStatus?: string;
  hasBill?: boolean;
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
        console.log('FETCH_APPOINTMENTS: Starting optimized appointment fetch');

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

        // PERFORMANCE OPTIMIZATION: Batch fetch all related data first
        console.log('FETCH_APPOINTMENTS: Starting batch data collection...');
        
        // Collect all unique IDs
        const petIds = new Set<string>();
        const groomerIds = new Set<string>();
        const serviceIds = new Set<string>();
        const billIds = new Set<string>();
        
        const appointmentDataArray: Array<{ id: string; data: FirestoreAppointmentData }> = [];
        
        querySnapshot.forEach(appointmentDoc => {
          const rawData = appointmentDoc.data() as FirestoreAppointmentData;
          appointmentDataArray.push({ id: appointmentDoc.id, data: rawData });
          
          if (rawData.petId) petIds.add(rawData.petId);
          if (rawData.groomerId) groomerIds.add(rawData.groomerId);
          if (rawData.services) rawData.services.forEach(serviceId => serviceIds.add(serviceId));
          if (rawData.billId) billIds.add(rawData.billId);
        });

        console.log('FETCH_APPOINTMENTS: Batch fetching', {
          pets: petIds.size,
          groomers: groomerIds.size, 
          services: serviceIds.size,
          bills: billIds.size
        });

        // Batch fetch all related data in parallel
        const [petsData, groomersData, servicesData, billsData] = await Promise.all([
          // Fetch all pets
          Promise.all(Array.from(petIds).map(async petId => {
            try {
              const petDoc = await getDoc(doc(db, 'pets', petId));
              return { id: petId, data: petDoc.exists() ? petDoc.data() : null };
            } catch (error) {
              console.error('Error fetching pet:', petId, error);
              return { id: petId, data: null };
            }
          })),
          // Fetch all groomers
          Promise.all(Array.from(groomerIds).map(async groomerId => {
            try {
              const groomerDoc = await getDoc(doc(db, 'users', groomerId));
              return { id: groomerId, data: groomerDoc.exists() ? groomerDoc.data() : null };
            } catch (error) {
              console.error('Error fetching groomer:', groomerId, error);
              return { id: groomerId, data: null };
            }
          })),
          // Fetch all services
          Promise.all(Array.from(serviceIds).map(async serviceId => {
            try {
              const serviceDoc = await getDoc(doc(db, 'services', serviceId));
              return { id: serviceId, data: serviceDoc.exists() ? serviceDoc.data() : null };
            } catch (error) {
              console.error('Error fetching service:', serviceId, error);
              return { id: serviceId, data: null };
            }
          })),
          // Fetch all bills
          Promise.all(Array.from(billIds).map(async billId => {
            try {
              const billDoc = await getDoc(doc(db, 'bills', billId));
              return { id: billId, data: billDoc.exists() ? billDoc.data() : null };
            } catch (error) {
              console.error('Error fetching bill:', billId, error);
              return { id: billId, data: null };
            }
          }))
        ]);

        // Create lookup maps for fast access
        const petsMap = new Map(petsData.map(p => [p.id, p.data]));
        const groomersMap = new Map(groomersData.map(g => [g.id, g.data]));
        const servicesMap = new Map(servicesData.map(s => [s.id, s.data]));
        const billsMap = new Map(billsData.map(b => [b.id, b.data]));

        // Collect unique customer IDs from pets
        const customerIds = new Set<string>();
        petsData.forEach(pet => {
          if (pet.data?.customerId) customerIds.add(pet.data.customerId);
        });

        // Batch fetch all customers
        const customersData = await Promise.all(Array.from(customerIds).map(async customerId => {
          try {
            const customerDoc = await getDoc(doc(db, 'customers', customerId));
            return { id: customerId, data: customerDoc.exists() ? customerDoc.data() : null };
          } catch (error) {
            console.error('Error fetching customer:', customerId, error);
            return { id: customerId, data: null };
          }
        }));
        
        const customersMap = new Map(customersData.map(c => [c.id, c.data]));

        console.log('FETCH_APPOINTMENTS: Batch fetching completed, processing appointments...');

        // Now process appointments using cached data
        const appointments: AppointmentWithRelations[] = [];
        let successCount = 0;
        let errorCount = 0;

        for (const { id: appointmentId, data: rawData } of appointmentDataArray) {
          try {
            // Removed individual appointment logging for better performance

            if (!rawData.petId || !rawData.groomerId) {
              console.error('FETCH_APPOINTMENTS: Missing required fields in appointment:', appointmentId);
              errorCount++;
              continue;
            }

            // Get pet data from cache
            const rawPetData = petsMap.get(rawData.petId);
            const petData = {
              name: rawPetData?.name || 'Unknown Pet',
              breed: rawPetData?.breed || 'Unknown Breed',
              image: rawPetData?.image || null,
              customerId: rawPetData?.customerId || 'unknown'
            };

            // Get groomer data from cache
            const rawGroomerData = groomersMap.get(rawData.groomerId);
            const groomerData = {
              name: rawGroomerData?.name || 'Unknown Groomer'
            };

            // Get customer data from cache
            const rawCustomerData = customersMap.get(petData.customerId);
            const customerData = {
              firstName: rawCustomerData?.firstName || 'Unknown',
              lastName: rawCustomerData?.lastName || 'Customer'
            };

            // Get service data from cache
            const serviceData = [];
            if (rawData.services && Array.isArray(rawData.services)) {
              for (const serviceId of rawData.services) {
                if (!serviceId) continue;
                
                const rawServiceData = servicesMap.get(serviceId);
                if (rawServiceData) {
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
                }
              }
            }

            // Get bill status from cache
            const billData = rawData.billId ? billsMap.get(rawData.billId) : null;
            const billStatus = billData?.status || null;

            const appointment: AppointmentWithRelations = {
              id: appointmentId,
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
              })),
              billId: rawData.billId,
              billStatus: billStatus,
              hasBill: Boolean(rawData.billId)
            };

            appointments.push(appointment);
            successCount++;

          } catch (error) {
            console.error('FETCH_APPOINTMENTS: Error processing appointment:', appointmentId, error);
            errorCount++;
            continue;
          }
        }

        console.log(`FETCH_APPOINTMENTS: Batch processing completed - ${successCount} appointments loaded in optimized mode (${errorCount} errors)`);
        return appointments;
      } catch (error) {
        console.error('Error fetching appointments:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - appointments don't change that frequently
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection time
    refetchOnWindowFocus: false, // Don't refetch on window focus for better performance
    refetchOnMount: false, // Don't refetch on mount if data is fresh
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