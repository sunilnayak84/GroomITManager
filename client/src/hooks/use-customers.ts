import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Customer } from "@db/schema";
import { getDocs, onSnapshot, query, deleteDoc, doc, where } from "firebase/firestore";
import { customersCollection, createCustomer, updateCustomer as updateCustomerDoc, deleteCustomerAndRelated } from "../lib/firestore";
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
      try {
        console.log('Starting delete mutation for customer:', id);
        const success = await deleteCustomerAndRelated(id);
        if (!success) {
          throw new Error('Delete operation did not complete successfully');
        }
        return id;
      } catch (error) {
        console.error('Error in delete mutation:', error);
        throw error;
      }
    },
    onSuccess: (deletedId) => {
      console.log('Delete mutation succeeded for customer:', deletedId);
      // Optimistically update the cache
      queryClient.setQueryData<Customer[]>(["customers"], (old) => 
        old?.filter(customer => customer.id !== deletedId) || []
      );
      
      // Force refetch to ensure consistency
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["customers"] }),
        queryClient.invalidateQueries({ queryKey: ["pets"] })
      ]).catch(error => {
        console.error('Error refetching data after deletion:', error);
      });
    },
    onError: (error) => {
      console.error('Delete mutation error:', error);
      // Let the component handle the error
      throw error;
    }
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
