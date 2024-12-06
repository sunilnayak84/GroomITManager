import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Pet, InsertPet } from "@db/schema";
import { getDocs, doc, runTransaction, increment, collection, addDoc, serverTimestamp } from "firebase/firestore";
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
    console.error('ADD_PET: Attempting to add pet', { 
      pet,
      petData: {
        ...pet,
        customerId: pet.customerId,
        name: pet.name,
        type: pet.type,
        breed: pet.breed
      }
    });

    // Validate required fields before submission
    const requiredFields: (keyof InsertPet)[] = ['name', 'type', 'breed', 'customerId'];
    const missingFields = requiredFields.filter(field => {
      const value = pet[field];
      return value === undefined || value === null || value === '';
    });

    if (missingFields.length > 0) {
      console.error('ADD_PET: Missing required fields', { 
        missingFields,
        pet 
      });
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    try {
      // Fetch the customer to ensure it exists
      const customerDoc = await getDoc(doc(db, 'customers', pet.customerId));
      if (!customerDoc.exists()) {
        console.error('ADD_PET: Customer not found', { 
          customerId: pet.customerId 
        });
        throw new Error('Selected customer does not exist');
      }

      // Add timestamp fields
      const petWithTimestamps = {
        ...pet,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Add the pet to Firestore
      const petRef = await addDoc(collection(db, 'pets'), petWithTimestamps);

      console.error('ADD_PET: Pet added successfully', { 
        petId: petRef.id,
        customerId: pet.customerId 
      });

      // Update the customer's pet count
      const customerRef = doc(db, 'customers', pet.customerId);
      
      await runTransaction(db, async (transaction) => {
        transaction.update(customerRef, {
          petCount: increment(1)
        });
      });

      // Update the cache
      queryClient.setQueryData(['pets'], (old: Pet[] | undefined) => {
        console.error('PETS HOOK: Updating query cache', { 
          oldPets: old, 
          newPet: petWithTimestamps 
        });
        if (!old) return [petWithTimestamps];
        return [...old, petWithTimestamps];
      });

      return {
        id: petRef.id,
        ...petWithTimestamps
      };
    } catch (error) {
      console.error('ADD_PET: Error adding pet', { 
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        pet 
      });
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
      queryClient.setQueryData(['pets'], (old: Pet[] | undefined) => {
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
      queryClient.setQueryData(['pets'], (old: Pet[] | undefined) => {
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
