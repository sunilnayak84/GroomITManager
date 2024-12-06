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
        const q = query(petsCollection);
        const querySnapshot = await getDocs(q);
        
        // First, fetch all customers to create a lookup map
        const customersQuery = query(customersCollection);
        const customersSnapshot = await getDocs(customersQuery);
        const customersMap = new Map(
          customersSnapshot.docs.map(doc => [
            doc.id, // Use the Firestore document ID directly
            {
              ...doc.data(),
              fullName: `${doc.data().firstName} ${doc.data().lastName}`
            }
          ])
        );

        console.log('PETS_QUERY: Customers Map Debug', JSON.stringify({
          customerCount: customersMap.size,
          customerIds: Array.from(customersMap.keys())
        }, null, 2));

        const fetchedPets = querySnapshot.docs.map((doc) => {
          const petData = doc.data();
          
          console.log('PET_QUERY: Detailed Pet Data Debug', JSON.stringify({
            petFirebaseId: doc.id,
            petData,
            customerId: petData.customerId,
            customerIdType: typeof petData.customerId
          }, null, 2));

          // Find customer using the Firestore document ID
          let customerDetails = null;
          if (petData.customerId && customersMap.has(petData.customerId)) {
            customerDetails = customersMap.get(petData.customerId);
            
            console.log('PET_QUERY: Customer Found Debug', JSON.stringify({
              customerId: petData.customerId,
              customerName: customerDetails?.fullName,
              customerData: customerDetails
            }, null, 2));
          } else {
            console.warn('PET_QUERY: Customer NOT Found Debug', JSON.stringify({
              searchedCustomerId: petData.customerId,
              availableCustomerIds: Array.from(customersMap.keys())
            }, null, 2));
          }

          return {
            id: petData.id || 0,
            firebaseId: doc.id,
            ...petData,
            owner: customerDetails ? {
              id: petData.customerId,
              name: customerDetails.fullName,
              phone: customerDetails.phone || '',
              email: customerDetails.email || ''
            } : null
          } as Pet;
        });

        console.log('PETS HOOK: Fetched Pets Summary Debug', JSON.stringify({ 
          petCount: fetchedPets.length,
          petsWithOwners: fetchedPets.map(p => ({ 
            id: p.id, 
            firebaseId: p.firebaseId,
            name: p.name, 
            owner: p.owner?.name,
            customerId: p.customerId
          }))
        }, null, 2));

        // Add additional properties to each pet
        const enrichedPets = fetchedPets.map(pet => ({
          ...pet,
          age: calculateAge(pet.dateOfBirth),
          weightRange: getWeightRange(pet.weight)
        }));

        return enrichedPets;
      } catch (error) {
        console.error('PETS HOOK: Critical Error', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
        throw error;
      }
    },
    // Add retry and stale time to improve performance and error handling
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

      // Increment customer's pet count
      await runTransaction(db, async (transaction) => {
        const customerRef = doc(db, 'customers', pet.customerId);
        transaction.update(customerRef, {
          petCount: increment(1),
          updatedAt: serverTimestamp()
        });
      });

      // Invalidate and refetch pets query
      await queryClient.invalidateQueries({ queryKey: ['pets'] });

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

  const updatePet = async (petId: string, petData: Partial<Pet>) => {
    console.error('UPDATE_PET: Attempting to update pet', JSON.stringify({ 
      petId, 
      petData 
    }, null, 2));

    try {
      // If a new image file is provided, upload it first
      let imageUrl = petData.image;
      if (petData.image instanceof File) {
        imageUrl = await uploadFile(
          petData.image, 
          `pets/${petId}/${Date.now()}_${petData.image.name}`
        );
      }

      // Update Firestore document with potentially new image URL
      const updateData = {
        ...petData,
        image: imageUrl,
        updatedAt: serverTimestamp()
      };

      await updateDoc(doc(db, 'pets', petId), updateData);
      return updateData;
    } catch (error) {
      console.error('UPDATE_PET: Error updating pet', JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        petId,
        petData
      }, null, 2));

      // Detailed error logging
      if (error instanceof Error) {
        console.error('UPDATE_PET: Detailed error', JSON.stringify({
          name: error.name,
          message: error.message,
          stack: error.stack
        }, null, 2));
      }

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
