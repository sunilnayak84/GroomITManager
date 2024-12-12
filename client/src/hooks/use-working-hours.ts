import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { WorkingDays, InsertWorkingDays } from "@/lib/schema";

export function useWorkingHours() {
  const queryClient = useQueryClient();

  const { data: workingHours, isLoading, error } = useQuery<WorkingDays[]>({
    queryKey: ["workingHours"],
    queryFn: async () => {
      try {
        const response = await fetch('/api/working-hours');
        if (!response.ok) {
          throw new Error('Failed to fetch working hours');
        }
        const data = await response.json();
        console.log('Fetched working hours:', data);
        return data;
      } catch (error) {
        console.error('Error fetching working hours:', error);
        throw error;
      }
    }
  });

  const addWorkingHoursMutation = useMutation({
    mutationFn: async (data: InsertWorkingDays) => {
      const response = await fetch(`/api/working-hours/${data.dayOfWeek}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to update working hours');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workingHours"] });
    }
  });

  return {
    data: workingHours,
    isLoading,
    error,
    addWorkingHours: addWorkingHoursMutation.mutateAsync
  };
}
