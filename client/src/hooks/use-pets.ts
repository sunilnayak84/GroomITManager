import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDocs, doc, runTransaction, increment, collection, addDoc, serverTimestamp, query, updateDoc, deleteDoc, getDoc, where, Timestamp } from 'firebase/firestore';
import { db } from "../lib/firebase";
import { petsCollection, customersCollection } from "../lib/firestore";
import { uploadFile } from "../lib/storage";
import { useState } from 'react';

import { Pet, PetInput, PetType, WeightUnit, Gender } from '../lib/types';

// Helper function to convert string to number safely
function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(num) ? null : num;
}

// Helper function to convert Firestore timestamp to ISO string
function timestampToString(timestamp: Timestamp | null | undefined): string | null {
  if (!timestamp) return null;
  return timestamp.toDate().toISOString();
}

export function usePets() {
  const queryClient = useQueryClient();
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchPets = async () => {
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
            doc.id,
            {
              id: doc.id,
              name: `${data.firstName} ${data.lastName}`,
              email: data.email
            }
          ];
        })
      );

      console.log('FETCH_PETS: Available customers:', Array.from(customersMap.entries()));

      const fetchedPets = querySnapshot.docs.map((doc) => {
        const petData = doc.data();
        const customerId = petData.customerId;
        const customerDetails = customersMap.get(customerId?.toString());
        
        console.log('FETCH_PETS: Processing pet data:', {
          petId: doc.id,
          customerId,
          petName: petData.name,
          customerDetails
        });

        return {
          id: doc.id,
          customerId: customerId?.toString(),
          name: petData.name,
          type: petData.type || 'dog',
          breed: petData.breed,
          image: petData.image || null,
          dateOfBirth: petData.dateOfBirth || null,
          age: toNumber(petData.age),
          gender: petData.gender || null,
          weight: toNumber(petData.weight),
          weightUnit: petData.weightUnit || 'kg',
          notes: petData.notes || null,
          createdAt: timestampToString(petData.createdAt) || new Date().toISOString(),
          updatedAt: timestampToString(petData.updatedAt),
          owner: customerDetails || null
        };
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
  };

  const { data: pets, isLoading, refetch } = useQuery({
    queryKey: ['pets', refreshKey],
    queryFn: fetchPets,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: 2,
    retryDelay: 1000
  });

  const addPetMutation = useMutation({
    mutationFn: async (petData: PetInput) => {
      try {
        console.log('ADD_PET: Starting to add pet', { petData });

        // Generate submission ID
        const submissionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        console.log('ADD_PET: Using submission ID:', submissionId);

        // Check for duplicate submission
        const duplicateSnapshot = await getDocs(
          query(petsCollection, where('submissionId', '==', submissionId))
        );
        
        if (!duplicateSnapshot.empty) {
          console.log('ADD_PET: Duplicate submission detected', { submissionId });
          return { isDuplicate: true, pet: duplicateSnapshot.docs[0].data() };
        }

        // Handle image upload if present
        let imageUrl: string | null = null;
        if (petData.image instanceof File) {
          try {
            const path = `pets/${petData.customerId}/${Date.now()}_${petData.image.name}`;
            imageUrl = await uploadFile(petData.image, path);
            console.log('ADD_PET: Image uploaded successfully:', imageUrl);
          } catch (uploadError) {
            console.error('ADD_PET: Image upload failed:', uploadError);
            throw new Error('Failed to upload pet image');
          }
        } else if (typeof petData.image === 'string') {
          imageUrl = petData.image;
        }

        // Create the new pet document
        const newPetData = {
          name: petData.name,
          type: petData.type,
          breed: petData.breed,
          customerId: petData.customerId,
          dateOfBirth: petData.dateOfBirth || null,
          age: toNumber(petData.age),
          gender: petData.gender || null,
          weight: toNumber(petData.weight),
          weightUnit: petData.weightUnit || 'kg',
          notes: petData.notes || null,
          image: imageUrl,
          submissionId,
          createdAt: serverTimestamp(),
          updatedAt: null
        };

        // Create the pet document with auto-generated ID
        const newPetDoc = await addDoc(collection(db, 'pets'), newPetData);
        console.log('ADD_PET: Created new pet document with ID:', newPetDoc.id);

        // Update customer's pet count
        const customerRef = doc(db, 'customers', petData.customerId);
        await updateDoc(customerRef, {
          petCount: increment(1)
        });

        // Return the created pet with all necessary fields
        const result = {
          ...newPetData,
          id: newPetDoc.id,
          createdAt: new Date().toISOString(),
          owner: petData.owner || null
        };

        console.log('ADD_PET: Successfully created pet:', result);
        return result;
      } catch (error) {
        console.error('ADD_PET: Error in mutation:', error);
        throw error;
      }
    },
    onSuccess: async (result) => {
      if (!('isDuplicate' in result)) {
        await queryClient.invalidateQueries({ queryKey: ['pets'] });
        setRefreshKey(prev => prev + 1);
        await refetch();
      }
    },
    onError: (error: Error) => {
      console.error('ADD_PET: Mutation error:', error);
    }
  });

  const updatePetMutation = useMutation({
    mutationFn: async ({ petId, updateData }: { petId: string; updateData: Partial<PetInput> }) => {
      try {
        const petRef = doc(petsCollection, petId);
        const petDoc = await getDoc(petRef);
        
        if (!petDoc.exists()) {
          throw new Error('Pet not found');
        }

        let imageUrl = updateData.image;
        if (updateData.image instanceof File) {
          const path = `pets/${updateData.customerId}/${Date.now()}_${updateData.image.name}`;
          imageUrl = await uploadFile(updateData.image, path);
        }

        const updates = {
          ...(updateData.name && { name: updateData.name }),
          ...(updateData.type && { type: updateData.type }),
          ...(updateData.breed && { breed: updateData.breed }),
          ...(updateData.customerId && { customerId: updateData.customerId }),
          ...(('dateOfBirth' in updateData) && { dateOfBirth: updateData.dateOfBirth }),
          ...(('age' in updateData) && { age: toNumber(updateData.age) }),
          ...(('gender' in updateData) && { gender: updateData.gender }),
          ...(('weight' in updateData) && { weight: toNumber(updateData.weight) }),
          ...(updateData.weightUnit && { weightUnit: updateData.weightUnit }),
          ...(('notes' in updateData) && { notes: updateData.notes }),
          ...(imageUrl && { image: imageUrl }),
          updatedAt: serverTimestamp()
        };

        await updateDoc(petRef, updates);
        return { success: true };
      } catch (error) {
        console.error('UPDATE_PET: Error updating pet:', error);
        throw error;
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['pets'] });
      setRefreshKey(prev => prev + 1);
      await refetch();
    }
  });

  const deletePetMutation = useMutation({
    mutationFn: async (petId: string) => {
      const petRef = doc(petsCollection, petId);
      const petDoc = await getDoc(petRef);
      
      if (!petDoc.exists()) {
        throw new Error('Pet not found');
      }

      const { customerId } = petDoc.data();
      const customerRef = doc(customersCollection, customerId?.toString());

      await runTransaction(db, async (transaction) => {
        transaction.delete(petRef);
        transaction.update(customerRef, {
          petCount: increment(-1)
        });
      });

      return { success: true };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['pets'] });
      setRefreshKey(prev => prev + 1);
      await refetch();
    }
  });

  return {
    pets,
    isLoading,
    addPet: addPetMutation.mutateAsync,
    updatePet: updatePetMutation.mutateAsync,
    deletePet: deletePetMutation.mutateAsync,
    refetch,
    addPetMutation,
    updatePetMutation,
    deletePetMutation
  };
}
