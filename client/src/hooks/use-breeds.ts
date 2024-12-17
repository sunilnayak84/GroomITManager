
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, doc, getDocs, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

interface Breed {
  id: string;
  name: string;
  type: 'dog' | 'cat';
  createdAt?: string;
  updatedAt?: string | null;
}

interface AddBreedData {
  name: string;
  type: 'dog' | 'cat';
}

export function useBreeds() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const breedsRef = collection(db, 'breeds');

  const { data: breeds } = useQuery({
    queryKey: ['breeds'],
    queryFn: async () => {
      const snapshot = await getDocs(breedsRef);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Breed[];
    }
  });

  const addBreed = async (data: AddBreedData) => {
    const newBreedRef = doc(breedsRef);
    await setDoc(newBreedRef, {
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: null
    });
    queryClient.invalidateQueries({ queryKey: ['breeds'] });
  };

  const updateBreed = async (id: string, data: AddBreedData) => {
    const breedRef = doc(breedsRef, id);
    await updateDoc(breedRef, {
      ...data,
      updatedAt: new Date().toISOString()
    });
    queryClient.invalidateQueries({ queryKey: ['breeds'] });
  };

  const deleteBreed = async (id: string) => {
    const breedRef = doc(breedsRef, id);
    await deleteDoc(breedRef);
    queryClient.invalidateQueries({ queryKey: ['breeds'] });
  };

  return {
    breeds,
    addBreed,
    updateBreed,
    deleteBreed
  };
}
