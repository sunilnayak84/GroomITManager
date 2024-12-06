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
      return querySnapshot.docs.map(doc => ({
        id: parseInt(doc.id),
        ...doc.data()
      } as Pet));
    },
  });

  const addPet = async (pet: Omit<Pet, 'id'>) => {
    const docRef = await addDoc(petsCollection, {
      ...pet,
      createdAt: new Date()
    });
    return {
      id: parseInt(docRef.id),
      ...pet
    };
  };

  const updatePet = async (id: number, data: Partial<Pet>) => {
    try {
      // Log the input values for debugging
      console.log('Update Pet Input:', { id, data });

      // Ensure id is a valid number
      const petId = typeof id === 'string' ? parseInt(id, 10) : id;
      
      // Additional logging
      console.log('Parsed Pet ID:', petId);
      console.log('Pet ID Type:', typeof petId);

      if (isNaN(petId)) {
        console.error('Invalid pet ID:', id);
        throw new Error('Invalid pet ID');
      }

      const petRef = doc(petsCollection, petId.toString());
      console.log('Attempting to update pet with ID:', petId);
      
      // Remove undefined values to prevent overwriting with undefined
      const updateData = Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== undefined)
      );

      await updateDoc(petRef, {
        ...updateData,
        updatedAt: new Date()
      });
      
      console.log('Pet updated successfully');
      return true;
    } catch (error) {
      console.error('Error updating pet:', error);
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
        id: parseInt(doc.id),
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
