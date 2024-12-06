import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Customer } from "@db/schema";
import { getDocs, onSnapshot, query, deleteDoc, doc, where, collection } from "firebase/firestore";
import { customersCollection, createCustomer, updateCustomer as updateCustomerDoc, deleteCustomerAndRelated } from "../lib/firestore";
import { useEffect } from "react";
import { db } from "../lib/firebase";

export function useCustomers() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<Customer[]>({
    queryKey: ["customers"],
    queryFn: async () => {
      try {
        const querySnapshot = await getDocs(customersCollection);
        return querySnapshot.docs.map(doc => ({
          id: parseInt(doc.id),
          ...doc.data(),
          // Ensure createdAt is a valid Date object
          createdAt: doc.data().createdAt 
            ? new Date(doc.data().createdAt) 
            : undefined
        } as Customer));
      } catch (error) {
        console.error('Error fetching customers:', error);
        throw error;
      }
    },
  });

  const addCustomerMutation = useMutation({
    mutationFn: async (customer: Omit<Customer, 'id'>) => {
      const id = await createCustomer({
        ...customer,
        createdAt: customer.createdAt || new Date(),
        petCount: 0 // Initialize petCount
      });
      return {
        id: parseInt(id),
        ...customer,
        petCount: 0,
        createdAt: customer.createdAt || new Date()
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

  // Set up real-time updates for both customers and their pets
  useEffect(() => {
    // Listen for customer updates
    const customerQuery = query(customersCollection);
    const customerUnsubscribe = onSnapshot(customerQuery, async (snapshot) => {
      const customers = snapshot.docs.map(doc => ({
        id: parseInt(doc.id),
        ...doc.data(),
        createdAt: doc.data().createdAt 
          ? new Date(doc.data().createdAt) 
          : undefined
      } as Customer));

      // Update customers in cache
      queryClient.setQueryData(["customers"], customers);
    });

    // Listen for pet updates to keep pet counts in sync
    const petsCollection = collection(db, 'pets');
    const petsUnsubscribe = onSnapshot(petsCollection, (snapshot) => {
      // Get current customers from cache
      const currentCustomers = queryClient.getQueryData<Customer[]>(["customers"]) || [];
      
      // Count pets for each customer
      const petCounts = new Map<number, number>();
      snapshot.docs.forEach(doc => {
        const pet = doc.data();
        if (pet.customerId) {
          const count = petCounts.get(pet.customerId) || 0;
          petCounts.set(pet.customerId, count + 1);
        }
      });

      // Update customers with new pet counts
      const updatedCustomers = currentCustomers.map(customer => ({
        ...customer,
        petCount: petCounts.get(customer.id) || 0
      }));

      // Update cache with new pet counts
      queryClient.setQueryData(["customers"], updatedCustomers);
    });

    return () => {
      customerUnsubscribe();
      petsUnsubscribe();
    };
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
