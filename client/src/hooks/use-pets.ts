import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Pet, InsertPet } from "@db/schema";
import { getDocs, doc, runTransaction, increment, collection, addDoc, serverTimestamp, query, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from "../lib/firebase";
import { petsCollection, customersCollection } from "../lib/firestore";
import { uploadFile } from "../lib/storage";

export type PetWithRelations = Pet & {
  owner: {
    id: string;
    firstName: string;
    lastName: string;
    name: string;
    phone: string;
    email: string;
  } | null;
};

export function usePets() {
  const queryClient = useQueryClient();

  const { data: pets, ...rest } = useQuery<PetWithRelations[]>({
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

        const fetchedPets = querySnapshot.docs.map((doc) => {
          const petData = doc.data();
          const customerDetails = customersMap.get(petData.customerId?.toString());
          
          console.log('FETCH_PETS: Processing pet data:', {
            petId: doc.id,
            petData,
            customerDetails
          });

          const pet = {
            id: doc.id,
            customerId: petData.customerId,
            name: petData.name,
            type: petData.type || 'dog',
            breed: petData.breed,
            image: petData.image || null,
            dateOfBirth: petData.dateOfBirth || null,
            age: petData.age || null,
            gender: petData.gender || null,
            weight: petData.weight || null,
            weightUnit: petData.weightUnit || 'kg',
            notes: petData.notes || null,
            owner: customerDetails ? {
              id: customerDetails.id,
              firstName: customerDetails.firstName,
              lastName: customerDetails.lastName,
              name: `${customerDetails.firstName} ${customerDetails.lastName}`,
              phone: customerDetails.phone || '',
              email: customerDetails.email || ''
            } : null
          } as PetWithRelations;

          return pet;
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

  const updatePet = async (id: string, updateData: Partial<InsertPet>) => {
    try {
      console.log('UPDATE_PET: Starting update', { id, updateData });

      // Validate parameters
      if (!id || typeof id !== 'string') {
        throw new Error('Valid pet ID string is required for update');
      }
      if (!updateData || typeof updateData !== 'object') {
        throw new Error('Valid update data object is required');
      }

      // Create document reference
      const petRef = doc(petsCollection, id);
      
      // Check if document exists
      const petDoc = await getDoc(petRef);
      if (!petDoc.exists()) {
        throw new Error(`Pet with ID ${id} not found`);
      }

      // Handle image upload if present
      let imageUrl = updateData.image;
      if (updateData.image instanceof File) {
        try {
          imageUrl = await uploadFile(
            updateData.image,
            `pets/${updateData.customerId}/${Date.now()}_${updateData.image.name}`
          );
        } catch (uploadError) {
          console.error('UPDATE_PET: Image upload failed:', uploadError);
          throw new Error('Failed to upload pet image');
        }
      }

      // Prepare update data
      const cleanData = {
        ...updateData,
        image: imageUrl,
        updatedAt: serverTimestamp()
      };

      // Remove undefined values
      Object.keys(cleanData).forEach(key => {
        if (cleanData[key] === undefined) {
          delete cleanData[key];
        }
        if (cleanData[key] === '') {
          cleanData[key] = null;
        }
      });

      console.log('UPDATE_PET: Preparing to update with data:', cleanData);

      // Update document
      await updateDoc(petRef, cleanData);

      // Invalidate queries
      await queryClient.invalidateQueries({ queryKey: ['pets'] });

      console.log('UPDATE_PET: Successfully updated pet:', { id, cleanData });
      return true;
    } catch (error) {
      console.error('UPDATE_PET: Error updating pet:', error);
      throw error;
    }
  };

  const deletePet = async (id: string) => {
    try {
      const petRef = doc(db, 'pets', id);
      const petDoc = await getDoc(petRef);

      if (!petDoc.exists()) {
        throw new Error('Pet not found');
      }

      const petData = petDoc.data();
      const customerId = petData.customerId;

      await deleteDoc(petRef);

      if (customerId) {
        const customerRef = doc(db, 'customers', customerId);
        await runTransaction(db, async (transaction) => {
          transaction.update(customerRef, {
            petCount: increment(-1),
            updatedAt: serverTimestamp()
          });
        });
      }

      await queryClient.invalidateQueries({ queryKey: ['pets'] });
      return { id };
    } catch (error) {
      console.error('DELETE_PET: Error deleting pet:', error);
      throw error;
    }
  };

  return {
    pets,
    updatePet,
    deletePet,
    ...rest
  };
}
