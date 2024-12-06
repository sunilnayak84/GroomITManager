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

  const updatePet = async (id: string, data: Partial<InsertPet>) => {
    // Comprehensive input validation
    console.log('updatePet called with:', {
      id, 
      data: JSON.stringify(data, null, 2),
      dataType: typeof data,
      dataKeys: data ? Object.keys(data) : 'NO DATA'
    });

    // Validate ID
    if (!id || typeof id !== 'string' || id.trim() === '') {
      console.error('Invalid or missing pet ID', { 
        id, 
        idType: typeof id,
        idLength: id ? id.length : 'N/A'
      });
      throw new Error('Invalid pet ID: ID must be a non-empty string');
    }

    // Validate data
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      console.error('Invalid update data', { 
        id, 
        data, 
        dataType: typeof data,
        isArray: Array.isArray(data)
      });
      throw new Error('Update data must be a non-null object');
    }

    // Ensure data has properties
    const dataKeys = Object.keys(data);
    if (dataKeys.length === 0) {
      console.error('Empty update data object', {
        id,
        data,
        dataType: typeof data
      });
      throw new Error('No fields provided for update');
    }

    // If the ID is a generated timestamp-based ID, log a warning
    if (id.startsWith('pet_')) {
      console.warn('Using generated timestamp-based ID for update:', id);
    }

    // Validate Firestore document reference
    let petRef;
    try {
      petRef = doc(petsCollection, id);
      console.log('Firestore Document Reference:', {
        path: petRef.path,
        id: petRef.id
      });
    } catch (refError) {
      console.error('Failed to create Firestore document reference', {
        error: refError,
        id
      });
      throw new Error('Unable to create document reference');
    }
    
    // Remove undefined and null values to prevent Firestore errors
    const updateData = Object.fromEntries(
      Object.entries(data)
        .filter(([_, v]) => 
          v !== undefined && 
          v !== null && 
          (typeof v !== 'string' || v.trim() !== '')
        )
        .map(([k, v]) => [k, v === '' ? null : v])
    );

    console.log('Cleaned Update Data:', JSON.stringify(updateData, null, 2));

    // Ensure we have data to update after cleaning
    if (Object.keys(updateData).length === 0) {
      console.error('No valid update data after cleaning', {
        originalData: data,
        cleanedData: updateData
      });
      throw new Error('No valid fields to update');
    }

    try {
      // Perform the update
      await updateDoc(petRef, {
        ...updateData,
        updatedAt: new Date()
      });
      
      console.log('Pet updated successfully', {
        id,
        updatedFields: Object.keys(updateData)
      });

      return true;
    } catch (updateError) {
      console.error('Firestore Update Error:', {
        errorName: updateError instanceof Error ? updateError.name : 'Unknown Error',
        errorMessage: updateError instanceof Error ? updateError.message : 'No error message',
        errorStack: updateError instanceof Error ? updateError.stack : 'No stack trace',
        inputData: { 
          id, 
          data: JSON.stringify(data, null, 2),
          updateData: JSON.stringify(updateData, null, 2)
        }
      });

      // Throw a more user-friendly error
      throw new Error(`Failed to update pet: ${updateError instanceof Error ? updateError.message : 'Unknown error'}`);
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
