import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Pet, InsertPet } from "@db/schema";
import { getDocs, addDoc, doc, updateDoc, deleteDoc, collection, getDoc, runTransaction } from "firebase/firestore";
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

      await runTransaction(db, async (transaction) => {
        // Add the pet
        const petsCollection = collection(db, 'pets');
        const petRef = await addDoc(petsCollection, {
          ...cleanedPet,
          createdAt: new Date(),
          updatedAt: new Date()
        });

        // Update the customer's pet count
        if (cleanedPet.customerId) {
          const customerRef = doc(db, 'customers', cleanedPet.customerId.toString());
          const customerDoc = await transaction.get(customerRef);
          
          if (customerDoc.exists()) {
            const currentPetCount = customerDoc.data().petCount || 0;
            transaction.update(customerRef, {
              petCount: currentPetCount + 1,
              updatedAt: new Date()
            });
          }
        }

        // Get the new pet data
        const newPetDoc = await getDoc(petRef);
        const newPet = {
          id: petRef.id,
          ...newPetDoc.data()
        } as Pet;

        // Update the cache
        queryClient.setQueryData<Pet[]>(['pets'], (old) => {
          if (!old) return [newPet];
          return [...old, newPet];
        });

        // Invalidate the customers query to update the pet count
        queryClient.invalidateQueries(['customers']);

        return newPet;
      });

      return pet as Pet;
    } catch (error) {
      console.error('Error adding pet:', error);
      throw error;
    }
  };

  const updatePet = async (id: string, updates: Partial<InsertPet>): Promise<Pet | null> => {
    try {
      await runTransaction(db, async (transaction) => {
        const petRef = doc(db, 'pets', id);
        
        // Get the current pet data
        const petDoc = await transaction.get(petRef);
        if (!petDoc.exists()) {
          throw new Error('Pet not found');
        }

        const currentPet = petDoc.data() as Pet;

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

        // If the customer is being changed, update both old and new customer's pet counts
        if (cleanedUpdates.customerId && cleanedUpdates.customerId !== currentPet.customerId) {
          // Decrease old customer's pet count
          if (currentPet.customerId) {
            const oldCustomerRef = doc(db, 'customers', currentPet.customerId.toString());
            const oldCustomerDoc = await transaction.get(oldCustomerRef);
            if (oldCustomerDoc.exists()) {
              const currentPetCount = oldCustomerDoc.data().petCount || 0;
              transaction.update(oldCustomerRef, {
                petCount: Math.max(0, currentPetCount - 1),
                updatedAt: new Date()
              });
            }
          }

          // Increase new customer's pet count
          const newCustomerRef = doc(db, 'customers', cleanedUpdates.customerId.toString());
          const newCustomerDoc = await transaction.get(newCustomerRef);
          if (newCustomerDoc.exists()) {
            const currentPetCount = newCustomerDoc.data().petCount || 0;
            transaction.update(newCustomerRef, {
              petCount: currentPetCount + 1,
              updatedAt: new Date()
            });
          }
        }

        // Update the pet
        transaction.update(petRef, updateData);

        // Get the updated pet data
        const updatedDoc = await getDoc(petRef);
        const updatedPet = {
          id: updatedDoc.id,
          ...updatedDoc.data()
        } as Pet;

        // Update the cache
        queryClient.setQueryData<Pet[]>(['pets'], (old) => {
          if (!old) return [updatedPet];
          return old.map(pet => pet.id === id ? updatedPet : pet);
        });

        // Invalidate the customers query to update the pet counts
        if (cleanedUpdates.customerId && cleanedUpdates.customerId !== currentPet.customerId) {
          queryClient.invalidateQueries(['customers']);
        }

        return updatedPet;
      });

      return null;
    } catch (error) {
      console.error('Error updating pet:', error);
      throw error;
    }
  };

  const deletePet = async (id: string) => {
    try {
      await runTransaction(db, async (transaction) => {
        const petRef = doc(db, 'pets', id);
        
        // Get the pet data before deleting
        const petDoc = await transaction.get(petRef);
        if (!petDoc.exists()) {
          throw new Error('Pet not found');
        }

        const pet = petDoc.data() as Pet;

        // Update the customer's pet count
        if (pet.customerId) {
          const customerRef = doc(db, 'customers', pet.customerId.toString());
          const customerDoc = await transaction.get(customerRef);
          if (customerDoc.exists()) {
            const currentPetCount = customerDoc.data().petCount || 0;
            transaction.update(customerRef, {
              petCount: Math.max(0, currentPetCount - 1),
              updatedAt: new Date()
            });
          }
        }

        // Delete the pet
        transaction.delete(petRef);

        // Update the cache
        queryClient.setQueryData<Pet[]>(['pets'], (old) => {
          if (!old) return [];
          return old.filter(p => p.id !== id);
        });

        // Invalidate the customers query to update the pet count
        queryClient.invalidateQueries(['customers']);
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
