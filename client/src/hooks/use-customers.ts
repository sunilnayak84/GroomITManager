import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Customer } from "@db/schema";
import { getDocs, onSnapshot, query, deleteDoc, doc } from "firebase/firestore";
import { customersCollection, createCustomer, updateCustomer as updateCustomerDoc } from "../lib/firestore";
import { useEffect } from "react";

export function useCustomers() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<Customer[]>({
    queryKey: ["customers"],
    queryFn: async () => {
      try {
        const querySnapshot = await getDocs(customersCollection);
        return querySnapshot.docs.map(doc => ({
          id: parseInt(doc.id),
          ...doc.data()
        } as Customer));
      } catch (error) {
        console.error('Error fetching customers:', error);
        throw error;
      }
    },
  });

  const addCustomerMutation = useMutation({
    mutationFn: async (customer: Omit<Customer, 'id'>) => {
      const id = await createCustomer(customer);
      return {
        id: parseInt(id),
        ...customer
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });

  const updateCustomerMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Omit<Customer, 'id'>> }) => {
      await updateCustomerDoc(id, data);
      return {
        id,
        ...data
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });

  // Set up real-time updates
  useEffect(() => {
    const q = query(customersCollection);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const customers = snapshot.docs.map(doc => ({
        id: parseInt(doc.id),
        ...doc.data()
      } as Customer));
      queryClient.setQueryData(["customers"], customers);
    });

    return () => unsubscribe();
  }, [queryClient]);

  const deleteCustomerMutation = useMutation({
    mutationFn: async (id: number) => {
      const customerRef = doc(customersCollection, id.toString());
      await deleteDoc(customerRef);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });

  return {
    data,
    isLoading,
    error,
    addCustomer: addCustomerMutation.mutateAsync,
    updateCustomer: updateCustomerMutation.mutateAsync,
    deleteCustomer: deleteCustomerMutation.mutateAsync,
  };
}
