import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Pet, InsertPet } from "@db/schema";

export function usePets() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<Pet[]>({
    queryKey: ["pets"],
    queryFn: async () => {
      const response = await fetch("/api/pets");
      if (!response.ok) {
        throw new Error("Failed to fetch pets");
      }
      return response.json();
    },
  });

  const addPet = async (pet: InsertPet) => {
    const response = await fetch("/api/pets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(pet),
    });

    if (!response.ok) {
      throw new Error("Failed to add pet");
    }

    return response.json();
  };

  const addPetMutation = useMutation({
    mutationFn: addPet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pets"] });
    },
  });

  return {
    data,
    isLoading,
    error,
    addPet: addPetMutation.mutateAsync,
  };
}
