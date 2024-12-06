import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Pet, InsertPet } from "@db/schema";
import { getDocs, addDoc, doc, updateDoc, deleteDoc, collection, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useEffect } from "react";

export function usePets() {
  const queryClient = useQueryClient();

  const { data: pets, isLoading } = useQuery<Pet[]>({
    queryKey: ['pets'],
    queryFn: () => {
      return new Promise((resolve, reject) => {
        try {
          const petsCollection = collection(db, 'pets');
          
          // Set up real-time listener
          const unsubscribe = onSnapshot(petsCollection, (snapshot) => {
            const petsData = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            } as Pet));
            
            resolve(petsData);
          }, (error) => {
            console.error('Error in real-time pets listener:', error);
            reject(error);
          });

          // Clean up listener on query cleanup
          return () => unsubscribe();
        } catch (error) {
          console.error('Error setting up pets listener:', error);
          reject(error);
        }
      });
    },
    staleTime: Infinity, // Disable automatic refetching since we're using real-time updates
  });

  const addPet = async (pet: InsertPet): Promise<Pet> => {
    try {
      const petsCollection = collection(db, 'pets');
      
      // Clean the pet data before adding
      const cleanedPet = Object.fromEntries(
        Object.entries(pet)
          .filter(([_, value]) => value !== undefined && value !== '')
          .map(([key, value]) => [key, value === '' ? null : value])
      );

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
