import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Appointment } from "@db/schema";
import { collection, getDocs, addDoc, onSnapshot, query, getDoc, doc } from 'firebase/firestore';
import { appointmentsCollection, petsCollection, customersCollection, usersCollection } from "../lib/firestore";
import React from "react";

type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

type AppointmentWithRelations = Omit<Appointment, 'status'> & {
  pet: { name: string; breed: string; image: string | null };
  customer: { firstName: string; lastName: string };
  groomer: { name: string };
  status: AppointmentStatus;
};

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

      return appointments as AppointmentWithRelations[];
    },
  });

  const addAppointmentMutation = useMutation({
    mutationFn: async (appointmentData: Omit<Appointment, 'id' | 'createdAt'>) => {
      const docRef = await addDoc(appointmentsCollection, {
        ...appointmentData,
        createdAt: new Date(),
        status: appointmentData.status || 'pending'
      });
      return {
        id: parseInt(docRef.id),
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
