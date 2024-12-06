import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Pet, InsertPet } from "@db/schema";
import { getDocs, addDoc, onSnapshot, query, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { petsCollection } from "../lib/firestore";
import React from "react";

export function usePets() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<Pet[]>({
    queryKey: ["pets"],
    queryFn: async () => {
      const querySnapshot = await getDocs(petsCollection);
      return querySnapshot.docs.map(doc => {
        const petData = doc.data();
        const pet = {
          ...petData,
          id: doc.id,  // Always use the Firestore document ID
          createdAt: petData.createdAt?.toDate() || new Date(),
          updatedAt: petData.updatedAt?.toDate() || new Date()
        } as Pet;
        console.log('Fetched Pet Document:', {
          id: doc.id,
          documentData: pet
        });
        return pet;
      });
    },
  });

  const addPet = async (pet: Omit<Pet, 'id'>) => {
    try {
      // Clean up pet data
      const cleanedPetData = Object.fromEntries(
        Object.entries(pet)
          .filter(([_, value]) => 
            value !== undefined && 
            value !== null && 
            value !== ''
          )
          .map(([key, value]) => [key, value === '' ? null : value])
      );

      console.log('Cleaned Pet Data for Adding:', cleanedPetData);

      const docRef = await addDoc(petsCollection, {
        ...cleanedPetData,
        createdAt: new Date()
      });

      console.log('Added Pet Document Reference:', docRef);

      // Invalidate and refetch
      await queryClient.invalidateQueries({ queryKey: ["pets"] });

      return {
        id: docRef.id,
        ...cleanedPetData
      } as Pet;
    } catch (error) {
      console.error('Error adding pet:', error);
      throw error;
    }
  };

  const updatePet = async (id: string, data: Partial<InsertPet>) => {
    console.log('updatePet called with:', {
      id, 
      data: JSON.stringify(data, null, 2)
    });

    // Validate ID
    if (!id || typeof id !== 'string' || id.trim() === '') {
      throw new Error('Invalid pet ID: ID must be a non-empty string');
    }

    // Validate data
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new Error('Update data must be a valid object');
    }

    // Clean the update data
    const updateData = Object.fromEntries(
      Object.entries(data)
        .filter(([_, v]) => 
          v !== undefined && 
          v !== null && 
          (typeof v !== 'string' || v.trim() !== '')
        )
        .map(([k, v]) => [k, v === '' ? null : v])
    );

    // Ensure we have data to update
    if (Object.keys(updateData).length === 0) {
      throw new Error('No valid fields to update');
    }

    try {
      const petRef = doc(petsCollection, id);
      
      // Add updatedAt timestamp
      const finalUpdateData = {
        ...updateData,
        updatedAt: new Date()
      };

      await updateDoc(petRef, finalUpdateData);
      
      // Invalidate and refetch
      await queryClient.invalidateQueries({ queryKey: ["pets"] });

      // Return the updated pet data
      return {
        id,
        ...updateData,
        updatedAt: new Date()
      } as Pet;
    } catch (error) {
      console.error('Error updating pet:', error);
      throw error;
    }
  };

  const deletePet = async (id: string) => {
    try {
      const petRef = doc(petsCollection, id);
      console.log('Attempting to delete pet with ID:', id);
      await deleteDoc(petRef);
      console.log('Pet deleted successfully');
      // Invalidate and refetch
      await queryClient.invalidateQueries({ queryKey: ["pets"] });
      return true;
    } catch (error) {
      console.error('Error deleting pet:', error);
      throw error;
    }
  };

  const addPetMutation = useMutation({
    mutationFn: addPet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pets"] });
    },
  });

  const updatePetMutation = useMutation({
    mutationFn: updatePet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pets"] });
    },
  });

  const deletePetMutation = useMutation({
    mutationFn: deletePet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pets"] });
    },
  });

  // Set up real-time updates
  React.useEffect(() => {
    const q = query(petsCollection);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const pets = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Pet));
      queryClient.setQueryData(["pets"], pets);
    });

    return () => unsubscribe();
  }, [queryClient]);

  return {
    data,
    isLoading,
    error,
    addPet: addPetMutation.mutateAsync,
    updatePet: updatePetMutation.mutateAsync,
    deletePet: deletePetMutation.mutateAsync,
  };
}
