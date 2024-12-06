import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Pet, InsertPet } from "@db/schema";
import { getDocs, doc, runTransaction, increment, collection, addDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { petsCollection, createPet } from "../lib/firestore";

export function usePets() {
  const queryClient = useQueryClient();

  const { data: pets, isLoading } = useQuery<Pet[]>({
    queryKey: ['pets'],
    queryFn: async () => {
      try {
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
      console.error('DEBUG: Attempting to add pet', { pet });

      // Validate required fields
      if (!pet.name) {
        throw new Error('Pet name is required');
      }
      if (!pet.type) {
        throw new Error('Pet type is required');
      }
      if (!pet.breed) {
        throw new Error('Pet breed is required');
      }
      if (!pet.customerId) {
        throw new Error('Customer ID is required');
      }

      // Clean the pet data before adding
      const cleanedPet = Object.fromEntries(
        Object.entries(pet)
          .filter(([_, value]) => value !== undefined && value !== '')
          .map(([key, value]) => [key, value === '' ? null : value])
      );

      console.error('DEBUG: Cleaned pet data', { cleanedPet });

      let newPet: Pet | null = null;

      await runTransaction(db, async (transaction) => {
        // Verify customer exists
        const customerRef = doc(db, 'customers', cleanedPet.customerId);
        const customerDoc = await transaction.get(customerRef);
        
        if (!customerDoc.exists()) {
          console.error('DEBUG: Customer not found', { customerId: cleanedPet.customerId });
          throw new Error(`Customer with ID ${cleanedPet.customerId} not found`);
        }

        // Add the pet
        const petsCollection = collection(db, 'pets');
        const petRef = await addDoc(petsCollection, {
          ...cleanedPet,
          createdAt: new Date(),
          updatedAt: new Date()
        });

        console.error('DEBUG: Pet added with ID', { petId: petRef.id });

        // Update the customer's pet count
        const currentPetCount = customerDoc.data().petCount || 0;
        transaction.update(customerRef, {
          petCount: currentPetCount + 1,
          updatedAt: new Date()
        });

        console.error('DEBUG: Customer pet count updated', { 
          customerId: cleanedPet.customerId, 
          newPetCount: currentPetCount + 1 
        });

        // Fetch the newly created pet
        const newPetDoc = await transaction.get(petRef);
        newPet = {
          id: petRef.id,
          ...newPetDoc.data()
        } as Pet;

        console.error('DEBUG: New pet created', { newPet });
      });

      if (!newPet) {
        throw new Error('Failed to create pet - no pet returned');
      }

      // Update the cache
      queryClient.setQueryData<Pet[]>(['pets'], (old) => {
        if (!old) return [newPet!];
        return [...old, newPet!];
      });

      return newPet;
    } catch (error) {
      console.error('CRITICAL ERROR: Failed to add pet', error);
      
      // More detailed error logging
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        });
      }

      throw error;
    }
  };

  const updatePet = async (id: string, updatedData: Partial<Pet>): Promise<void> => {
    try {
      const petRef = doc(db, 'pets', id);
      await runTransaction(db, async (transaction) => {
        const petDoc = await transaction.get(petRef);
        
        if (!petDoc.exists()) {
          throw new Error('Pet not found');
        }

        // If customer is being changed, update pet counts
        const currentData = petDoc.data() as Pet;
        if (updatedData.customerId && updatedData.customerId !== currentData.customerId) {
          // Decrease old customer's pet count
          const oldCustomerRef = doc(db, 'customers', currentData.customerId);
          const oldCustomerDoc = await transaction.get(oldCustomerRef);
          if (oldCustomerDoc.exists()) {
            transaction.update(oldCustomerRef, {
              petCount: increment(-1)
            });
          }

          // Increase new customer's pet count
          const newCustomerRef = doc(db, 'customers', updatedData.customerId);
          const newCustomerDoc = await transaction.get(newCustomerRef);
          if (newCustomerDoc.exists()) {
            transaction.update(newCustomerRef, {
              petCount: increment(1)
            });
          } else {
            throw new Error('New customer not found');
          }
        }

        // Update the pet
        transaction.update(petRef, {
          ...updatedData,
          updatedAt: new Date()
        });
      });

      // Update the cache
      queryClient.setQueryData<Pet[]>(['pets'], (old) => {
        if (!old) return old;
        return old.map(pet => {
          if (pet.id === id) {
            return {
              ...pet,
              ...updatedData,
              updatedAt: new Date()
            };
          }
          return pet;
        });
      });
    } catch (error) {
      console.error('Error updating pet:', error);
      throw error;
    }
  };

  const deletePet = async (id: string, customerId: string): Promise<void> => {
    try {
      const petRef = doc(db, 'pets', id);
      
      await runTransaction(db, async (transaction) => {
        // Delete the pet
        transaction.delete(petRef);

        // Update customer's pet count
        const customerRef = doc(db, 'customers', customerId);
        const customerDoc = await transaction.get(customerRef);
        
        if (customerDoc.exists()) {
          transaction.update(customerRef, {
            petCount: increment(-1)
          });
        }
      });

      // Update the cache
      queryClient.setQueryData<Pet[]>(['pets'], (old) => {
        if (!old) return old;
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
    deletePet
  };
}
