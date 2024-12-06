import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Pet, InsertPet } from "@db/schema";
import { getDocs, addDoc, onSnapshot, query, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { petsCollection } from "../lib/firestore";
import React from "react";

export function usePets() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<Pet[]>({
    queryKey: ["pets"],
    queryFn: async () => {
      const querySnapshot = await getDocs(petsCollection);
      return querySnapshot.docs.map(doc => ({
        id: parseInt(doc.id),
        ...doc.data()
      } as Pet));
    },
  });

  const addPet = async (pet: Omit<Pet, 'id'>) => {
    const docRef = await addDoc(petsCollection, {
      ...pet,
      createdAt: new Date()
    });
    return {
      id: parseInt(docRef.id),
      ...pet
    };
  };

  const updatePet = async (id: number, data: Partial<Pet>) => {
    const petRef = doc(petsCollection, id.toString());
    await updateDoc(petRef, {
      ...data,
      updatedAt: new Date()
    });
    return true;
  };

  const deletePet = async (id: number) => {
    const petRef = doc(petsCollection, id.toString());
    await deleteDoc(petRef);
    return true;
  };

  const addPetMutation = useMutation({
    mutationFn: addPet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pets"] });
    },
  });

  const updatePetMutation = useMutation({
    mutationFn: updatePet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pets"] });
    },
  });

  const deletePetMutation = useMutation({
    mutationFn: deletePet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pets"] });
    },
  });

  // Set up real-time updates
  React.useEffect(() => {
    const q = query(petsCollection);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const pets = snapshot.docs.map(doc => ({
        id: parseInt(doc.id),
        ...doc.data()
      } as Pet));
      queryClient.setQueryData(["pets"], pets);
    });

    return () => unsubscribe();
  }, [queryClient]);

  return {
    data,
    isLoading,
    error,
    addPet: addPetMutation.mutateAsync,
    updatePet: updatePetMutation.mutateAsync,
    deletePet: deletePetMutation.mutateAsync,
  };
}
