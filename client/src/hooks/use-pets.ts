import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { type Pet, type InsertPet } from "@/lib/schema";
import { db } from "@/lib/firebase";
import { collection, doc, getDocs, setDoc, deleteDoc, updateDoc } from "firebase/firestore";
import { uploadFile } from "@/lib/storage";

const petsCollection = collection(db, "pets");

export function usePets() {
  const queryClient = useQueryClient();

  const { data: pets, ...rest } = useQuery<Pet[]>({
    queryKey: ["pets"],
    queryFn: async () => {
      const snapshot = await getDocs(petsCollection);
      return snapshot.docs.map(doc => ({
        id: parseInt(doc.id),
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || null,
        updatedAt: doc.data().updatedAt?.toDate() || null,
      } as Pet));
    }
  });

  const addPetMutation = useMutation({
    mutationFn: async (petData: Omit<Pet, 'id' | 'createdAt' | 'updatedAt'>) => {
      try {
        // Handle image upload if present
        let imageUrl = petData.image;
        if (petData.image instanceof File) {
          try {
            imageUrl = await uploadFile(
              petData.image,
              `pets/${Date.now()}_${petData.image.name}`
            );
          } catch (error) {
            console.error('Error uploading image:', error);
            throw new Error('Failed to upload image');
          }
        }

        const docRef = doc(petsCollection);
        const newPetData = {
          ...petData,
          id: parseInt(docRef.id),
          image: imageUrl,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        // Remove undefined values and convert empty strings to null
        Object.keys(newPetData).forEach(key => {
          if (newPetData[key] === undefined) {
            delete newPetData[key];
          }
          if (newPetData[key] === '') {
            newPetData[key] = null;
          }
        });

        await setDoc(docRef, newPetData);

        toast.success('Pet added successfully');
        return newPetData as Pet;
      } catch (error) {
        console.error('Error adding pet:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to add pet');
        throw error;
      }
    }
  });

  const updatePetMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Pet> & { id: number }) => {
      try {
        const petRef = doc(petsCollection, id.toString());

        // Handle image upload if present
        let imageUrl = data.image;
        if (data.image instanceof File) {
          try {
            imageUrl = await uploadFile(
              data.image,
              `pets/${Date.now()}_${data.image.name}`
            );
          } catch (error) {
            console.error('Error uploading image:', error);
            throw new Error('Failed to upload image');
          }
        }

        const updateData = {
          ...data,
          image: imageUrl,
          updatedAt: new Date()
        };

        await updateDoc(petRef, updateData);
        await queryClient.invalidateQueries({ queryKey: ['pets'] });
        toast.success('Pet updated successfully');
        return true;
      } catch (error) {
        console.error('Error updating pet:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to update pet');
        throw error;
      }
    }
  });

  const deletePetMutation = useMutation({
    mutationFn: async (id: number) => {
      try {
        const petRef = doc(petsCollection, id.toString());
        await deleteDoc(petRef);
        await queryClient.invalidateQueries({ queryKey: ['pets'] });
        toast.success('Pet deleted successfully');
        return true;
      } catch (error) {
        console.error('Error deleting pet:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to delete pet');
        throw error;
      }
    }
  });

  return {
    pets,
    isLoading: rest.isPending,
    addPet: addPetMutation.mutateAsync,
    updatePet: updatePetMutation.mutateAsync,
    deletePet: deletePetMutation.mutateAsync,
  };
}
