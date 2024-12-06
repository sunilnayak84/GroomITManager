import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Pet, InsertPet } from "@db/schema";
import { getDocs, addDoc, doc, updateDoc, deleteDoc, collection, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

export function usePets() {
  const queryClient = useQueryClient();

  const { data: pets, isLoading } = useQuery<Pet[]>({
    queryKey: ['pets'],
    queryFn: async () => {
      try {
        const petsCollection = collection(db, 'pets');
        const querySnapshot = await getDocs(petsCollection);
        return querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Pet));
      } catch (error) {
        console.error('Error fetching pets:', error);
        throw error;
      }
    }
  });

  const addPet = async (pet: InsertPet): Promise<Pet> => {
    try {
      // Clean the pet data before adding
      const cleanedPet = Object.fromEntries(
        Object.entries(pet)
          .filter(([_, value]) => value !== undefined && value !== '')
          .map(([key, value]) => [key, value === '' ? null : value])
      );

      const petsCollection = collection(db, 'pets');
      const docRef = await addDoc(petsCollection, {
        ...cleanedPet,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const newPetDoc = await getDoc(docRef);
      const newPet = {
        id: docRef.id,
        ...newPetDoc.data()
      } as Pet;

      // Update the cache manually
      queryClient.setQueryData<Pet[]>(['pets'], (old) => {
        if (!old) return [newPet];
        return [...old, newPet];
      });

      return newPet;
    } catch (error) {
      console.error('Error adding pet:', error);
      throw error;
    }
  };

  const updatePet = async (id: string, updates: Partial<InsertPet>): Promise<Pet | null> => {
    try {
      const petRef = doc(db, 'pets', id);
      
      // Get the current pet data
      const petDoc = await getDoc(petRef);
      if (!petDoc.exists()) {
        throw new Error('Pet not found');
      }

      // Clean the update data
      const cleanedUpdates = Object.fromEntries(
        Object.entries(updates)
          .filter(([_, value]) => value !== undefined && value !== '')
          .map(([key, value]) => [key, value === '' ? null : value])
      );

      const updateData = {
        ...cleanedUpdates,
        updatedAt: new Date()
      };

      await updateDoc(petRef, updateData);

      // Get the updated document
      const updatedDoc = await getDoc(petRef);
      if (!updatedDoc.exists()) {
        throw new Error('Failed to retrieve updated pet');
      }

      const updatedPet = {
        id: updatedDoc.id,
        ...updatedDoc.data()
      } as Pet;

      // Update the cache manually
      queryClient.setQueryData<Pet[]>(['pets'], (old) => {
        if (!old) return [updatedPet];
        return old.map(pet => pet.id === id ? updatedPet : pet);
      });

      return updatedPet;
    } catch (error) {
      console.error('Error updating pet:', error);
      throw error;
    }
  };

  const deletePet = async (id: string) => {
    try {
      const petRef = doc(db, 'pets', id);
      await deleteDoc(petRef);

      // Update the cache manually
      queryClient.setQueryData<Pet[]>(['pets'], (old) => {
        if (!old) return [];
        return old.filter(pet => pet.id !== id);
      });
    } catch (error) {
      console.error('Error deleting pet:', error);
      throw error;
    }
  };

  return {
    pets,
    isLoading,
    addPet,
    updatePet,
    deletePet,
  };
}
