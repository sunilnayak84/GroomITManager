import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Appointment, InsertAppointment } from "@db/schema";

export function useAppointments() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<Appointment[]>({
    queryKey: ["appointments"],
    queryFn: async () => {
      const response = await fetch("/api/appointments");
      if (!response.ok) {
        throw new Error("Failed to fetch appointments");
      }
      return response.json();
    },
  });

  const addAppointment = async (appointment: InsertAppointment) => {
    const response = await fetch("/api/appointments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(appointment),
    });

    if (!response.ok) {
      throw new Error("Failed to add appointment");
    }

    return response.json();
  };

  const addAppointmentMutation = useMutation({
    mutationFn: addAppointment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
  });

  return {
    data,
    isLoading,
    error,
    addAppointment: addAppointmentMutation.mutateAsync,
  };
}
