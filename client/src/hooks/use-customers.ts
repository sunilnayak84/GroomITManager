import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Customer, InsertCustomer } from "@db/schema";

export function useCustomers() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<Customer[]>({
    queryKey: ["customers"],
    queryFn: async () => {
      const response = await fetch("/api/customers");
      if (!response.ok) {
        throw new Error("Failed to fetch customers");
      }
      return response.json();
    },
  });

  const addCustomer = async (customer: InsertCustomer) => {
    const response = await fetch("/api/customers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(customer),
    });

    if (!response.ok) {
      throw new Error("Failed to add customer");
    }

    return response.json();
  };

  const addCustomerMutation = useMutation({
    mutationFn: addCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });

  return {
    data,
    isLoading,
    error,
    addCustomer: addCustomerMutation.mutateAsync,
  };
}
