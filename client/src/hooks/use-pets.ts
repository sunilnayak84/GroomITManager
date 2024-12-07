import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Pet, InsertPet } from "@db/schema";
import { getDocs, doc, runTransaction, increment, collection, addDoc, serverTimestamp, query, updateDoc, deleteDoc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { petsCollection, createPet, customersCollection } from "../lib/firestore";
import { uploadFile } from "../lib/storage";

export const usePets = () => {
  const queryClient = useQueryClient();

  const { data: pets, ...rest } = useQuery({
    queryKey: ['pets'],
    queryFn: async () => {
      try {
        console.log('FETCH_PETS: Starting to fetch pets');
        const q = query(petsCollection);
        const querySnapshot = await getDocs(q);
        
        // First, fetch all customers to create a lookup map
        const customersQuery = query(customersCollection);
        const customersSnapshot = await getDocs(customersQuery);
        const customersMap = new Map(
          customersSnapshot.docs.map(doc => {
            const data = doc.data();
            return [
              doc.id,
              {
                id: doc.id,
                firstName: data.firstName,
                lastName: data.lastName,
                phone: data.phone,
                email: data.email
              }
            ];
          })
        );

        console.log('FETCH_PETS: Processing pet documents');
        const fetchedPets = querySnapshot.docs.map((doc) => {
          const petData = doc.data();
          const customerDetails = customersMap.get(petData.customerId);

          console.log('FETCH_PETS: Processing pet', {
            petId: doc.id,
            petData,
            customerId: petData.customerId,
            hasCustomerDetails: !!customerDetails
          });

          return {
            id: doc.id,
            customerId: petData.customerId,
            name: petData.name,
            type: petData.type,
            breed: petData.breed,
            image: petData.image || null,
            owner: customerDetails ? {
              id: customerDetails.id,
              firstName: customerDetails.firstName,
              lastName: customerDetails.lastName,
              phone: customerDetails.phone || '',
              email: customerDetails.email || ''
            } : undefined
          } as Pet;
        });

        console.log('FETCH_PETS: Completed fetching pets', {
          totalPets: fetchedPets.length,
          pets: fetchedPets
        });

        return fetchedPets;
      } catch (error) {
        console.error('FETCH_PETS: Error fetching pets:', error);
        throw error;
      }
    },
    retry: 2,
    staleTime: 1000 * 60 * 5 // 5 minutes
  });

  const addPet = async (pet: InsertPet) => {
    console.log('ADD_PET: Attempting to add pet', JSON.stringify({ 
      pet,
      petData: {
        ...pet,
        customerId: pet.customerId,
        name: pet.name,
        type: pet.type,
        breed: pet.breed
      }
    }, null, 2));

    try {
      // Validate required fields before submission
      const requiredFields: (keyof InsertPet)[] = ['name', 'type', 'breed', 'customerId'];
      const missingFields = requiredFields.filter(field => {
        const value = pet[field];
        return value === undefined || value === null || value === '';
      });

      if (missingFields.length > 0) {
        console.error('ADD_PET: Missing required fields', JSON.stringify({ 
          missingFields,
          petData: pet
        }, null, 2));
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      // Verify customer exists
      const customerDocRef = doc(db, 'customers', pet.customerId);
      const customerDoc = await getDoc(customerDocRef);

      if (!customerDoc.exists()) {
        throw new Error(`Customer with ID ${pet.customerId} does not exist`);
      }

      // Upload image if present
      let imageUrl;
      if (pet.image instanceof File) {
        imageUrl = await uploadFile(
          pet.image, 
          `pets/${pet.customerId}/${Date.now()}_${pet.image.name}`
        );
      } else if (pet.imageUrl) {
        imageUrl = pet.imageUrl;
      }

      // Prepare pet data for Firestore
      const petData = {
        name: pet.name,
        type: pet.type,
        breed: pet.breed,
        customerId: pet.customerId,
        ...(pet.dateOfBirth ? { dateOfBirth: pet.dateOfBirth } : {}),
        ...(imageUrl ? { image: imageUrl } : {}),
        ...(pet.gender ? { gender: pet.gender } : {}),
        ...(pet.weight ? { weight: pet.weight } : {}),
        ...(pet.height ? { height: pet.height } : {}),
        ...(pet.notes ? { notes: pet.notes } : {}),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Add pet to Firestore
      const newPetRef = await addDoc(petsCollection, petData);

      // Use a transaction to update customer's pet count
      await runTransaction(db, async (transaction) => {
        const customerRef = doc(db, 'customers', pet.customerId);
        const customerDoc = await transaction.get(customerRef);
        
        if (!customerDoc.exists()) {
          throw new Error('Customer document does not exist');
        }

        const currentPetCount = customerDoc.data().petCount || 0;
        transaction.update(customerRef, {
          petCount: currentPetCount + 1,
          updatedAt: serverTimestamp()
        });
      });

      // Invalidate and refetch pets and customers queries
      await queryClient.invalidateQueries({ queryKey: ['pets'] });
      await queryClient.invalidateQueries({ queryKey: ['customers'] });

      // Return the newly created pet with its ID
      return {
        id: newPetRef.id,
        ...petData
      } as Pet;
    } catch (error) {
      console.error('ADD_PET: Error adding pet', JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        pet
      }, null, 2));

      // Detailed error logging
      if (error instanceof Error) {
        console.error('ADD_PET: Detailed error', JSON.stringify({
          name: error.name,
          message: error.message,
          stack: error.stack
        }, null, 2));
      }

      throw error;
    }
  };

  const updatePet = async (data: { id: string; [key: string]: any }) => {
    const { id, ...updateData } = data;
    const petRef = doc(db, "pets", id);

    // Remove undefined values and clean up the data
    const cleanData = Object.fromEntries(
      Object.entries(updateData)
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => {
          // Convert empty strings to null for optional fields
          if (value === "") {
            return [key, null];
          }
          // Handle weight specifically
          if (key === "weight" && value === null) {
            return [key, null];
          }
          return [key, value];
        })
    );

    try {
      await updateDoc(petRef, {
        ...cleanData,
        updatedAt: serverTimestamp()
      });

      // Manually update the cache
      queryClient.setQueryData(["pets"], (oldData: Pet[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map(pet => 
          pet.id === id ? { ...pet, ...cleanData } : pet
        );
      });

      return true;
    } catch (error) {
      console.error("Error updating pet:", error);
      throw error;
    }
  };

  const deletePet = async (id: string) => {
    console.error('DELETE_PET: Attempting to delete pet', JSON.stringify({ id }, null, 2));

    try {
      const petRef = doc(db, 'pets', id);
      const petDoc = await getDoc(petRef);

      if (!petDoc.exists()) {
        console.error('DELETE_PET: Pet not found', JSON.stringify({ id }, null, 2));
        throw new Error('Pet not found');
      }

      // Get the customer ID before deleting
      const petData = petDoc.data();
      const customerId = petData.customerId;

      // Delete the pet
      await deleteDoc(petRef);

      console.error('DELETE_PET: Pet deleted successfully', JSON.stringify({ id }, null, 2));

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
      console.error('DELETE_PET: Error deleting pet', JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        id 
      }, null, 2));

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

// Helper functions
function calculateAge(dateOfBirth: Date | null): number | null {
  if (!dateOfBirth) return null;
  const today = new Date();
  const age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    return age - 1;
  }
  return age;
}

function getWeightRange(weight: number | null): string | null {
  if (!weight) return null;
  if (weight < 10) return 'Small';
  if (weight < 20) return 'Medium';
  return 'Large';
}
