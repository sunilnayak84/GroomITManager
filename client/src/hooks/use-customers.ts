import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Customer } from "@db/schema";
import { collection, getDocs, addDoc, onSnapshot, query } from "firebase/firestore";
import { db } from "../lib/firebase";
import { customersCollection } from "../lib/firestore";
import React from "react";

export function useCustomers() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<Customer[]>({
    queryKey: ["customers"],
    queryFn: async () => {
      const querySnapshot = await getDocs(customersCollection);
      return querySnapshot.docs.map(doc => ({
        id: parseInt(doc.id),
        ...doc.data()
      } as Customer));
    },
  });

  const addCustomer = async (customer: Omit<Customer, 'id'>) => {
    const docRef = await addDoc(customersCollection, {
      ...customer,
      createdAt: new Date()
    });
    return {
      id: parseInt(docRef.id),
      ...customer
    };
  };

  const addCustomerMutation = useMutation({
    mutationFn: addCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });

  // Set up real-time updates
  React.useEffect(() => {
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

  return {
    data,
    isLoading,
    error,
    addCustomer: addCustomerMutation.mutateAsync,
  };
}
