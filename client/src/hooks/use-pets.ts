import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Pet, InsertPet } from "@db/schema";
import { getDocs, addDoc, onSnapshot, query, doc, updateDoc, deleteDoc, collection, getDoc } from "firebase/firestore";
import { petsCollection } from "../lib/firestore";
import { db } from "../lib/firebase"; // Import the Firebase database instance
import React from "react";

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
    },
  });

  const addPet = async (pet: InsertPet): Promise<Pet> => {
    try {
      const petsCollection = collection(db, 'pets');
      const docRef = await addDoc(petsCollection, {
        ...pet,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const newPet = {
        id: docRef.id,
        ...pet,
        createdAt: new Date(),
        updatedAt: new Date()
      } as Pet;

      // Invalidate and refetch
      await queryClient.invalidateQueries({ queryKey: ['pets'] });

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

      const updateData = {
        ...updates,
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

      // Invalidate and refetch
      await queryClient.invalidateQueries({ queryKey: ['pets'] });

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

      // Invalidate and refetch
      await queryClient.invalidateQueries({ queryKey: ['pets'] });
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
