import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Pet, InsertPet } from "@db/schema";
import { getDocs, doc, runTransaction, increment, collection, addDoc, serverTimestamp, query, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { petsCollection, createPet } from "../lib/firestore";

export const usePets = () => {
  const queryClient = useQueryClient();

  const { data: pets, ...rest } = useQuery({
    queryKey: ['pets'],
    queryFn: async () => {
      const q = query(petsCollection);
      const querySnapshot = await getDocs(q);
      
      const fetchedPets = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as Pet[];

      console.error('PETS HOOK: Fetched pets', { 
        petCount: fetchedPets.length,
        pets: fetchedPets.map(p => ({ id: p.id, name: p.name }))
      });

      return fetchedPets;
    }
  });

  const addPet = async (pet: InsertPet) => {
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
      // Validate customer ID format
      if (!pet.customerId || typeof pet.customerId !== 'string' || pet.customerId.trim() === '') {
        console.error('ADD_PET: Invalid customer ID', { 
          customerId: pet.customerId 
        });
        throw new Error('Invalid customer ID');
      }

      // Fetch the customer to ensure it exists
      const customerRef = doc(db, 'customers', pet.customerId);
      const customerDoc = await getDoc(customerRef);

      if (!customerDoc.exists()) {
        console.error('ADD_PET: Customer not found', { 
          customerId: pet.customerId,
          customerRef: customerRef.path
        });
        throw new Error('Selected customer does not exist');
      }

      // Prepare pet data with cleaned values
      const cleanedPet = Object.fromEntries(
        Object.entries(pet)
          .filter(([_, value]) => value !== undefined && value !== '')
          .map(([key, value]) => [key, value === '' ? null : value])
      ) as InsertPet;

      // Add timestamp fields
      const petWithTimestamps = {
        ...cleanedPet,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Add the pet to Firestore
      const petsCollection = collection(db, 'pets');
      const petRef = await addDoc(petsCollection, petWithTimestamps);

      console.error('ADD_PET: Pet added successfully', { 
        petId: petRef.id,
        customerId: pet.customerId,
        petData: petWithTimestamps
      });

      // Update customer's pet count in a transaction
      await runTransaction(db, async (transaction) => {
        transaction.update(customerRef, {
          petCount: increment(1),
          updatedAt: serverTimestamp()
        });
      });

      // Update the cache
      queryClient.setQueryData(['pets'], (old: Pet[] | undefined) => {
        console.error('PETS HOOK: Updating query cache', { 
          oldPets: old, 
          newPet: petWithTimestamps 
        });
        if (!old) return [{ id: petRef.id, ...petWithTimestamps }];
        return [...old, { id: petRef.id, ...petWithTimestamps }];
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
      
      // More detailed error logging
      if (error instanceof Error) {
        console.error('ADD_PET: Detailed error', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }

      throw error;
    }
  };

  const updatePet = async (id: string, updates: Partial<InsertPet>) => {
    console.error('UPDATE_PET: Attempting to update pet', { 
      id, 
      updates 
    });

    try {
      const petRef = doc(db, 'pets', id);
      
      // Validate that at least one field is being updated
      if (Object.keys(updates).length === 0) {
        console.error('UPDATE_PET: No updates provided');
        throw new Error('No updates provided');
      }

      // Add updatedAt timestamp
      const updateWithTimestamp = {
        ...updates,
        updatedAt: serverTimestamp()
      };

      await updateDoc(petRef, updateWithTimestamp);

      console.error('UPDATE_PET: Pet updated successfully', { 
        petId: id,
        updates: updateWithTimestamp 
      });

      // Update the cache
      queryClient.setQueryData(['pets'], (old: Pet[] | undefined) => {
        if (!old) return old;
        return old.map(pet => {
          if (pet.id === id) {
            return {
              ...pet,
              ...updateWithTimestamp
            };
          }
          return pet;
        });
      });

      // Fetch the updated pet to return the latest data
      const updatedPetDoc = await getDoc(petRef);
      return {
        id,
        ...updatedPetDoc.data()
      } as Pet;
    } catch (error) {
      console.error('UPDATE_PET: Error updating pet', { 
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        id,
        updates 
      });

      throw error;
    }
  };

  const deletePet = async (id: string) => {
    console.error('DELETE_PET: Attempting to delete pet', { id });

    try {
      const petRef = doc(db, 'pets', id);
      const petDoc = await getDoc(petRef);

      if (!petDoc.exists()) {
        console.error('DELETE_PET: Pet not found', { id });
        throw new Error('Pet not found');
      }

      // Get the customer ID before deleting
      const petData = petDoc.data();
      const customerId = petData.customerId;

      // Delete the pet
      await deleteDoc(petRef);

      console.error('DELETE_PET: Pet deleted successfully', { id });

      // Decrement customer's pet count if customer ID exists
      if (customerId) {
        const customerRef = doc(db, 'customers', customerId);
        await runTransaction(db, async (transaction) => {
          transaction.update(customerRef, {
            petCount: increment(-1),
            updatedAt: serverTimestamp()
          });
        });
      }

      // Update the cache
      queryClient.setQueryData(['pets'], (old: Pet[] | undefined) => {
        if (!old) return old;
        return old.filter(pet => pet.id !== id);
      });

      return { id };
    } catch (error) {
      console.error('DELETE_PET: Error deleting pet', { 
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        id 
      });

      throw error;
    }
  };

  return {
    pets,
    addPet,
    updatePet,
    deletePet,
    ...rest
  };
};
