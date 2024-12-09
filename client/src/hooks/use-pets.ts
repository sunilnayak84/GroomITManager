import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Pet as PetType, InsertPet } from "@db/schema";
import { getDocs, doc, runTransaction, increment, collection, addDoc, serverTimestamp, query, updateDoc, deleteDoc, getDoc, where } from 'firebase/firestore';
import { db } from "../lib/firebase";
import { petsCollection, customersCollection, createPet } from "../lib/firestore";
import { uploadFile } from "../lib/storage";
import { toast } from "../lib/toast";

export type Pet = {
  id: string;
  customerId: string;  // Firebase document ID
  name: string;
  type: "dog" | "cat" | "bird" | "fish" | "other";
  breed: string;
  image: string | null;
  dateOfBirth: { seconds: number; nanoseconds: number; } | string | null;
  age: number | null;
  gender: "male" | "female" | "unknown" | null;
  weight: string | null;
  weightUnit: "kg" | "lbs";
  notes: string | null;
  owner?: {
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

  const { data: pets, isLoading, ...rest } = useQuery<Pet[], Error>({
    queryKey: ["pets"],
    queryFn: async () => {
      try {
        console.log('FETCH_PETS: Starting to fetch pets');
        const q = query(petsCollection);
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          console.log('FETCH_PETS: No pets found in collection');
          return [];
        }
        
        // First, fetch all customers to create a lookup map
        const customersQuery = query(customersCollection);
        const customersSnapshot = await getDocs(customersQuery);
        
        const customersMap = new Map(
          customersSnapshot.docs.map(doc => {
            const data = doc.data();
            return [
              doc.id,  // Use the Firebase document ID as the key
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

        console.log('FETCH_PETS: Available customers:', 
          Array.from(customersMap.entries()).map(([id, data]) => ({
            id,
            name: `${data.firstName} ${data.lastName}`
          }))
        );

        const fetchedPets = querySnapshot.docs.map((doc) => {
          const petData = doc.data();
          const customerId = petData.customerId;  // Use the raw customerId
          const customerDetails = customersMap.get(customerId);
          
          console.log('FETCH_PETS: Processing pet data:', {
            petId: doc.id,
            customerId,
            petName: petData.name,
            customerDetails: customerDetails ? {
              id: customerDetails.id,
              name: `${customerDetails.firstName} ${customerDetails.lastName}`
            } : null
          });

          const pet: PetWithRelations = {
            id: doc.id,
            customerId: customerId,
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
          };

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

  const updatePet = async (petId: string, updateData: Partial<InsertPet>) => {
    try {
      console.log('UPDATE_PET: Starting update', { 
        petId, 
        updateData,
        petIdType: typeof petId,
        updateDataType: typeof updateData 
      });

      // Validate parameters
      if (!petId) {
        throw new Error('Pet ID is required');
      }

      if (typeof petId !== 'string') {
        throw new Error(`Invalid pet ID type: ${typeof petId}. Expected string.`);
      }

      if (!updateData || typeof updateData !== 'object') {
        throw new Error('Update data must be a valid object');
      }

      // Create document reference
      const petRef = doc(petsCollection, petId);
      
      // Check if document exists
      const petDoc = await getDoc(petRef);
      if (!petDoc.exists()) {
        throw new Error(`Pet with ID ${petId} not found`);
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

      console.log('UPDATE_PET: Successfully updated pet:', { petId, cleanData });
      return true;
    } catch (error) {
      console.error('UPDATE_PET: Error updating pet:', error);
      throw error;
    }
  };

  // Function to check for duplicate submission ID
  const checkDuplicateSubmission = async (submissionId: string) => {
    try {
      const q = query(petsCollection, where('submissionId', '==', submissionId));
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Error checking for duplicate submission:', error);
      throw error;
    }
  };

  const addPetMutation = useMutation({
    mutationFn: async (petData: InsertPet) => {
      try {
        console.log('ADD_PET: Starting to add pet', { petData });

        // Check for duplicate submission
        if (petData.submissionId) {
          const existingPet = await checkDuplicateSubmission(petData.submissionId);
          if (existingPet) {
            console.log('ADD_PET: Duplicate submission detected', { submissionId: petData.submissionId });
            toast.success("This pet has already been submitted.");
            // Proceed to add the pet anyway
          }
        }

        // Validate required fields
        if (!petData.name || !petData.breed || !petData.type || !petData.customerId) {
          throw new Error('Required fields are missing');
        }

        // Handle image upload if present
        let imageUrl = petData.image;
        if (petData.image instanceof File) {
          try {
            imageUrl = await uploadFile(
              petData.image,
              `pets/${petData.customerId}/${Date.now()}_${petData.image.name}`
            );
          } catch (uploadError) {
            console.error('ADD_PET: Image upload failed:', uploadError);
            throw new Error('Failed to upload pet image');
          }
        }

        // Prepare pet data with Firebase-compatible structure
        const timestamp = serverTimestamp();
        const newPetData = {
          ...petData,
          image: imageUrl,
          createdAt: timestamp,
          updatedAt: timestamp
        };

        // Clean the data
        const cleanedData = Object.entries(newPetData).reduce((acc, [key, value]) => {
          if (value !== undefined && value !== '') {
            acc[key] = value === '' ? null : value;
          }
          return acc;
        }, {});

        console.log('ADD_PET: Adding pet with data:', cleanedData);
        
        // Start a transaction to ensure atomicity
        let petId: string;
        await runTransaction(db, async (transaction) => {
          // First create the pet
          petId = await createPet(cleanedData);
          
          // Then update the customer's pet count
          if (cleanedData.customerId) {
            const customerRef = doc(customersCollection, cleanedData.customerId);
            const customerDoc = await transaction.get(customerRef);
            if (!customerDoc.exists()) {
              throw new Error('Customer not found');
            }
            const currentCount = customerDoc.data().petCount || 0;
            transaction.update(customerRef, {
              petCount: currentCount + 1,
              updatedAt: timestamp
            });
          }
        });

        // Wait for queries to be invalidated before returning
        await queryClient.invalidateQueries({ queryKey: ['pets'] });
        await queryClient.invalidateQueries({ queryKey: ['customers'] });

        return { id: petId, ...cleanedData };
      } catch (error) {
        console.error('ADD_PET: Error adding pet:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      // Update local state for pet count
      const customerId = data.customerId;
      queryClient.setQueryData(['customers'], (oldData) => {
        if (oldData) {
          return oldData.map(customer => {
            if (customer.id === customerId) {
              return {
                ...customer,
                petCount: (customer.petCount || 0) + 1 // Increment pet count
              };
            }
            return customer;
          });
        }
        return oldData;
      });
      // Invalidate queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['pets'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: (error) => {
      console.error('ADD_PET: Mutation error:', error);
    }
  });

  const addPet = addPetMutation.mutateAsync;

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
    isLoading,
    addPet,
    updatePet,
    deletePet,
    addPetMutation,
    ...rest
  };
}
