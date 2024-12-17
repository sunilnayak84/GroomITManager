import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  collection, getDocs, doc, runTransaction, increment, 
  addDoc, serverTimestamp, query, updateDoc, deleteDoc, 
  getDoc, where, Timestamp, FieldValue, WithFieldValue,
  DocumentData
} from 'firebase/firestore';
import { db } from "../lib/firebase";
import { petsCollection, customersCollection } from "../lib/firestore";
import { uploadFile } from "../lib/storage";
import { useState } from 'react';
import type { Pet, PetInput, FirestorePet } from '../lib/types';

// Helper function to convert string to number safely
function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(num) ? null : num;
}

// Helper function to convert Firestore timestamp to string
function timestampToString(timestamp: Timestamp | null | undefined): string | null {
  if (!timestamp) return null;
  return timestamp.toDate().toISOString();
}

// Helper function to parse Firestore pet data
function parseFirestorePet(id: string, data: FirestorePet): Pet {
  return {
    id,
    firebaseId: data.firebaseId,
    name: data.name,
    type: data.type,
    breed: data.breed,
    customerId: data.customerId,
    dateOfBirth: data.dateOfBirth || null,
    age: toNumber(data.age),
    gender: data.gender || null,
    weight: toNumber(data.weight),
    weightUnit: data.weightUnit || 'kg',
    notes: data.notes || null,
    image: data.image || null,
    createdAt: timestampToString(data.createdAt) ?? new Date().toISOString(),
    updatedAt: timestampToString(data.updatedAt),
    owner: data.owner || null
  };
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

      const fetchedPets = querySnapshot.docs.map((doc) => {
        const petData = doc.data() as FirestorePet;
        const customerId = petData.customerId;
        const customerDetails = customersMap.get(customerId?.toString());
        
        try {
          return parseFirestorePet(doc.id, {
            ...petData,
            owner: customerDetails ? {
              id: customerDetails.id,
              name: customerDetails.name,
              email: customerDetails.email as string | null
            } : null
          });
        } catch (error) {
          console.error('FETCH_PETS: Error parsing pet data:', {
            petId: doc.id,
            error
          });
          return null;
        }
      }).filter((pet): pet is Pet => pet !== null);

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

  const { data: pets = [], isLoading, error, ...rest } = useQuery({
    queryKey: ['pets', refreshKey],
    queryFn: fetchPets,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
    refetchOnWindowFocus: false
  });

  const addPetMutation = useMutation({
    mutationFn: async (petData: PetInput) => {
      try {
        console.log('ADD_PET: Starting to add pet', { petData });

        // Generate submission ID
        const submissionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Check for duplicate submission
        const duplicateQuery = query(petsCollection, where('submissionId', '==', submissionId));
        const duplicateSnapshot = await getDocs(duplicateQuery);
        
        if (!duplicateSnapshot.empty) {
          console.log('ADD_PET: Duplicate submission detected', { submissionId });
          const duplicateDoc = duplicateSnapshot.docs[0];
          return { 
            isDuplicate: true, 
            pet: parseFirestorePet(duplicateDoc.id, duplicateDoc.data() as FirestorePet)
          };
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

        // Create the new pet document with typed data
        const timestamp = serverTimestamp();
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
          createdAt: timestamp,
          updatedAt: null,
          firebaseId: null
        };

        // Create pet document with proper Firestore types
        const firestoreData: WithFieldValue<DocumentData> = {
          name: newPetData.name,
          type: newPetData.type,
          breed: newPetData.breed,
          customerId: newPetData.customerId,
          dateOfBirth: newPetData.dateOfBirth,
          age: newPetData.age,
          gender: newPetData.gender,
          weight: newPetData.weight,
          weightUnit: newPetData.weightUnit,
          notes: newPetData.notes,
          image: newPetData.image,
          firebaseId: null,
          createdAt: serverTimestamp(),
          updatedAt: null,
          owner: null,
          submissionId
        };
        const newPetDoc = await addDoc(petsCollection, firestoreData);
        console.log('ADD_PET: Created new pet document with ID:', newPetDoc.id);

        // Update customer's pet count
        const customerRef = doc(customersCollection, petData.customerId);
        await updateDoc(customerRef, {
          petCount: increment(1)
        });

        // Return the created pet
        return {
          success: true,
          pet: {
            id: newPetDoc.id,
            ...newPetData,
            createdAt: new Date().toISOString(),
            owner: petData.owner || null
          }
        };
      } catch (error) {
        console.error('ADD_PET: Error in mutation:', error);
        throw error;
      }
    },
    onSuccess: async (result) => {
      if (!('isDuplicate' in result)) {
        await queryClient.invalidateQueries({ queryKey: ['pets'] });
        setRefreshKey(prev => prev + 1);
      }
    }
  });

  const updatePetMutation = useMutation({
    mutationFn: async ({ petId, updateData }: { petId: string; updateData: Partial<PetInput> }) => {
      try {
        const petRef = doc(petsCollection, petId);
        const timestamp = serverTimestamp();

        let imageUrl = updateData.image;
        if (updateData.image instanceof File) {
          const path = `pets/${updateData.customerId}/${Date.now()}_${updateData.image.name}`;
          imageUrl = await uploadFile(updateData.image, path);
        }

        const updates: Record<string, any> = {
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
          ...(imageUrl && { image: imageUrl })
        };
        updates.updatedAt = serverTimestamp();

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
    }
  });

  const deletePetMutation = useMutation({
    mutationFn: async (petId: string) => {
      const petRef = doc(petsCollection, petId);
      const petDoc = await getDoc(petRef);
      
      if (!petDoc.exists()) {
        throw new Error('Pet not found');
      }

      const petData = petDoc.data() as FirestorePet;
      const customerRef = doc(customersCollection, petData.customerId);

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
    }
  });

  return {
    pets,
    isLoading,
    error,
    addPet: addPetMutation.mutateAsync,
    updatePet: updatePetMutation.mutateAsync,
    deletePet: deletePetMutation.mutateAsync,
    refetch: () => queryClient.invalidateQueries({ queryKey: ['pets'] }),
    addPetMutation,
    updatePetMutation,
    deletePetMutation
  };
}