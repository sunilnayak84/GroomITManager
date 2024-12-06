import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Pet, InsertPet } from "@db/schema";
import { getDocs, doc, runTransaction, increment, collection, addDoc, serverTimestamp, query, updateDoc, deleteDoc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { petsCollection, createPet } from "../lib/firestore";
import { uploadFile } from "../lib/storage";

export const usePets = () => {
  const queryClient = useQueryClient();

  const { data: pets, ...rest } = useQuery({
    queryKey: ['pets'],
    queryFn: async () => {
      const q = query(petsCollection);
      const querySnapshot = await getDocs(q);
      
      const fetchedPets = await Promise.all(querySnapshot.docs.map(async (doc) => {
        const petData = doc.data();
        
        console.error('PET_QUERY: Raw Pet Data', {
          petId: doc.id,
          petData,
          customerId: petData.customerId,
          firebaseId: petData.firebaseId
        });

        // Fetch associated customer details
        let customerDetails = null;
        if (petData.customerId) {
          try {
            const customerRef = doc(db, 'customers', petData.customerId.toString());
            const customerDoc = await getDoc(customerRef);
            
            console.error('PET_QUERY: Customer Lookup', {
              customerId: petData.customerId,
              customerExists: customerDoc.exists(),
              customerData: customerDoc.exists() ? customerDoc.data() : null
            });

            if (customerDoc.exists()) {
              customerDetails = {
                id: customerDoc.id,
                ...customerDoc.data()
              };
            }
          } catch (error) {
            console.error('PET_QUERY: Customer Fetch Error', {
              petId: doc.id,
              customerId: petData.customerId,
              error: error instanceof Error ? error.message : error
            });
          }
        }

        const petWithOwner = {
          id: doc.data().id || 0, // Fallback to 0 if id is not present
          firebaseId: doc.id, // Use Firestore document ID as firebaseId
          ...petData,
          owner: customerDetails ? {
            id: customerDetails.id,
            name: `${customerDetails.firstName} ${customerDetails.lastName}`,
            phone: customerDetails.phone || '',
            email: customerDetails.email || ''
          } : null
        } as Pet;

        console.error('PET_QUERY: Processed Pet', {
          petId: petWithOwner.id,
          firebaseId: petWithOwner.firebaseId,
          petName: petWithOwner.name,
          ownerName: petWithOwner.owner?.name,
          customerId: petWithOwner.customerId
        });

        return petWithOwner;
      }));

      console.error('PETS HOOK: Fetched pets', { 
        petCount: fetchedPets.length,
        pets: fetchedPets.map(p => ({ 
          id: p.id, 
          firebaseId: p.firebaseId,
          name: p.name, 
          owner: p.owner?.name,
          customerId: p.customerId
        }))
      });

      return fetchedPets;
    }
  });

  const addPet = async (pet: InsertPet) => {
    console.log('ADD_PET: Attempting to add pet', { 
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
        petData: pet
      });
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    try {
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
      console.error('ADD_PET: Error adding pet', { 
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        pet
      });

      // Detailed error logging
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

  const updatePet = async (petId: string, petData: Partial<Pet>) => {
    console.error('UPDATE_PET: Attempting to update pet', { 
      petId, 
      petData 
    });

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
      console.error('UPDATE_PET: Error updating pet', { 
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        petId,
        petData
      });

      // Detailed error logging
      if (error instanceof Error) {
        console.error('UPDATE_PET: Detailed error', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }

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
