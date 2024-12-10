import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Appointment, AppointmentWithRelations } from "@/lib/schema";
import { collection, getDocs, addDoc, onSnapshot, query, getDoc, doc, type WithFieldValue } from 'firebase/firestore';
import { appointmentsCollection, petsCollection, customersCollection, usersCollection } from "../lib/firestore";
import React from "react";

export function useAppointments() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<AppointmentWithRelations[]>({
    queryKey: ["appointments"],
    queryFn: async () => {
      const querySnapshot = await getDocs(appointmentsCollection);
      const appointments = [];

      for (const appointmentDoc of querySnapshot.docs) {
        const appointmentData = appointmentDoc.data();
        
        // Get pet details
        const petDoc = await getDoc(doc(petsCollection, appointmentData.petId));
        const petData = petDoc.data();
        
        // Get customer details through pet's customerId
        const customerDoc = await getDoc(doc(customersCollection, petData?.customerId));
        const customerData = customerDoc.data();
        
        // Get groomer details
        const groomerDoc = await getDoc(doc(usersCollection, appointmentData.groomerId));
        const groomerData = groomerDoc.data();

        appointments.push({
          id: appointmentDoc.id,
          petId: appointmentData.petId,
          serviceId: appointmentData.serviceId,
          groomerId: appointmentData.groomerId,
          branchId: appointmentData.branchId,
          date: appointmentData.date.toDate(),
          status: appointmentData.status || 'pending',
          notes: appointmentData.notes,
          productsUsed: appointmentData.productsUsed,
          createdAt: appointmentData.createdAt.toDate(),
          pet: {
            name: petData?.name || '',
            breed: petData?.breed || '',
            image: petData?.image || null
          },
          customer: {
            firstName: customerData?.firstName || '',
            lastName: customerData?.lastName || ''
          },
          groomer: {
            name: groomerData?.name || ''
          }
        });
      }

      return appointments;
    },
  });

  const addAppointmentMutation = useMutation({
    mutationFn: async (appointmentData: Omit<AppointmentWithRelations, 'id' | 'createdAt' | 'pet' | 'customer' | 'groomer'>) => {
      const docRef = await addDoc(appointmentsCollection, {
        ...appointmentData,
        createdAt: new Date(),
        status: appointmentData.status || 'pending'
      });
      return {
        id: docRef.id,
        ...appointmentData,
        createdAt: new Date()
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
  });

  // Set up real-time updates
  React.useEffect(() => {
    const q = query(appointmentsCollection);
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const appointments = [];
      
      for (const appointmentDoc of snapshot.docs) {
        const appointmentData = appointmentDoc.data();
        
        // Get pet details
        const petDoc = await getDoc(doc(petsCollection, appointmentData.petId.toString()));
        const petData = petDoc.data();
        
        // Get customer details through pet's customerId
        const customerDoc = await getDoc(doc(customersCollection, petData?.customerId.toString()));
        const customerData = customerDoc.data();
        
        // Get groomer details
        const groomerDoc = await getDoc(doc(usersCollection, appointmentData.groomerId.toString()));
        const groomerData = groomerDoc.data();

        appointments.push({
          id: parseInt(appointmentDoc.id),
          petId: appointmentData.petId,
          groomerId: appointmentData.groomerId,
          date: appointmentData.date,
          status: appointmentData.status || 'pending',
          notes: appointmentData.notes,
          createdAt: appointmentData.createdAt,
          pet: {
            name: petData?.name || '',
            breed: petData?.breed || '',
            image: petData?.image || null
          },
          customer: {
            firstName: customerData?.firstName || '',
            lastName: customerData?.lastName || ''
          },
          groomer: {
            name: groomerData?.name || ''
          }
        });
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
