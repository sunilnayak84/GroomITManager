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
        const petData = {
          ...doc.data(),
          id: doc.id  // Use the document ID directly
        } as Pet;
        console.log('Fetched Pet Document:', {
          id: doc.id,
          documentData: petData
        });
        return petData;
      });
    },
  });

  const addPet = async (pet: Omit<Pet, 'id'>) => {
    // Clean up pet data to remove undefined and null values
    const cleanedPetData = Object.fromEntries(
      Object.entries(pet)
        .filter(([_, value]) => 
          value !== undefined && 
          value !== null && 
          value !== ''
        )
        .map(([key, value]) => [
          key, 
          // Convert empty strings to null
          value === '' ? null : value
        ])
    );

    console.log('Cleaned Pet Data for Adding:', cleanedPetData);

    try {
      const docRef = await addDoc(petsCollection, {
        ...cleanedPetData,
        createdAt: new Date()
      });

      console.log('Added Pet Document Reference:', docRef);

      return {
        id: docRef.id,
        ...cleanedPetData
      };
    } catch (error) {
      console.error('Error adding pet:', {
        errorName: error instanceof Error ? error.name : 'Unknown Error',
        errorMessage: error instanceof Error ? error.message : 'No error message',
        errorStack: error instanceof Error ? error.stack : 'No stack trace'
      });
      throw error;
    }
  };

  const updatePet = async (id: string, data: Partial<Pet>) => {
    try {
      // Extensive logging for debugging
      console.log('Raw Update Pet Input:', { 
        id, 
        idType: typeof id, 
        data,
        dataKeys: Object.keys(data)
      });

      // Validate ID
      if (!id || typeof id !== 'string' || id.trim() === '') {
        console.error('Invalid pet ID:', id);
        throw new Error('Invalid pet ID');
      }

      const petRef = doc(petsCollection, id);
      console.log('Firestore Document Reference:', {
        path: petRef.path,
        id: petRef.id
      });
      
      // Remove undefined and null values to prevent Firestore errors
      const updateData = Object.fromEntries(
        Object.entries(data)
          .filter(([_, v]) => v !== undefined && v !== null)
          .map(([k, v]) => [k, v === '' ? null : v])
      );

      console.log('Cleaned Update Data:', updateData);

      await updateDoc(petRef, {
        ...updateData,
        updatedAt: new Date()
      });
      
      console.log('Pet updated successfully');
      return true;
    } catch (error) {
      console.error('Comprehensive Error in updatePet:', {
        errorName: error instanceof Error ? error.name : 'Unknown Error',
        errorMessage: error instanceof Error ? error.message : 'No error message',
        errorStack: error instanceof Error ? error.stack : 'No stack trace'
      });
      throw error;
    }
  };

  const deletePet = async (id: number) => {
    try {
      const petRef = doc(petsCollection, id.toString());
      console.log('Attempting to delete pet with ID:', id);
      await deleteDoc(petRef);
      console.log('Pet deleted successfully');
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
