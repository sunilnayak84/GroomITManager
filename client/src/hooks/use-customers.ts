import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Customer } from "@db/schema";
import { getDocs, onSnapshot, query, deleteDoc, doc, where, collection } from "firebase/firestore";
import { customersCollection, createCustomer, updateCustomer as updateCustomerDoc, deleteCustomerAndRelated } from "../lib/firestore";
import { useEffect } from "react";
import { db } from "../lib/firebase";
import { toast } from '../lib/toast';

export function useCustomers() {
  const queryClient = useQueryClient();

  const addCustomerMutation = useMutation({
    mutationFn: async (customer: InsertCustomer) => {
      // Detailed validation and logging
      const validationErrors: string[] = [];

      // Validate firstName
      if (!customer.firstName || customer.firstName.trim().length < 2) {
        validationErrors.push("First name must be at least 2 characters");
      }

      // Validate lastName
      if (!customer.lastName || customer.lastName.trim().length < 2) {
        validationErrors.push("Last name must be at least 2 characters");
      }

      // Validate email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!customer.email || !emailRegex.test(customer.email)) {
        validationErrors.push("Invalid email format");
      }

      // Validate phone
      const phoneRegex = /^[0-9]{10,}$/;
      const phoneDigits = customer.phone.replace(/\D/g, '');
      if (!customer.phone || !phoneRegex.test(phoneDigits)) {
        validationErrors.push("Phone number must be at least 10 digits");
      }

      // Validate gender
      const validGenders = ['male', 'female', 'other'];
      if (!customer.gender || !validGenders.includes(customer.gender)) {
        validationErrors.push("Invalid gender selection");
      }

      // If there are validation errors, throw them
      if (validationErrors.length > 0) {
        console.error('ADD_CUSTOMER: Validation errors', { 
          errors: validationErrors,
          customerData: customer
        });
        throw new Error(validationErrors.join('; '));
      }

      try {
        // Log the attempt to create a customer
        console.log('ADD_CUSTOMER: Attempting to create customer', { customer });

        const id = await createCustomer({
          ...customer,
          createdAt: customer.createdAt || new Date(),
          petCount: 0 // Initialize petCount
        });

        // Log successful creation
        console.log('ADD_CUSTOMER: Customer created successfully', { id });

        return {
          id,
          ...customer,
          petCount: 0,
          createdAt: customer.createdAt || new Date()
        };
      } catch (error) {
        // Log the full error details
        console.error('ADD_CUSTOMER: Error creating customer', { 
          error,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          customer
        });
        
        // Throw a more descriptive error
        throw new Error(
          error instanceof Error 
            ? error.message 
            : 'Failed to create customer. Please check your input and try again.'
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer added successfully");
    },
    onError: (error) => {
      console.error('ADD_CUSTOMER: Mutation error', { error });
      toast.error(
        error instanceof Error 
          ? error.message 
          : "Failed to add customer. Please try again."
      );
    }
  });

  const updateCustomerMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Omit<Customer, 'id'>> }) => {
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

  // Separate function for delete mutation logic
  const deleteCustomerMutation = async (id: string) => {
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
  };

  const deleteCustomerMutationHook = useMutation({
    mutationFn: deleteCustomerMutation,
    onMutate: async (deletedId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["customers"] });
      await queryClient.cancelQueries({ queryKey: ["pets"] });

      // Snapshot the previous value
      const previousCustomers = queryClient.getQueryData<Customer[]>(["customers"]);

      // Optimistically update the cache
      queryClient.setQueryData<Customer[]>(["customers"], old => 
        old?.filter(customer => customer.id !== deletedId) || []
      );

      return { previousCustomers };
    },
    onSuccess: (deletedId) => {
      console.log('Delete mutation succeeded for customer:', deletedId);
      toast.success("Customer deleted successfully");
    },
    onError: (error, _, context) => {
      console.error('Delete mutation error:', error);
      // Rollback to the previous state
      if (context?.previousCustomers) {
        queryClient.setQueryData(["customers"], context.previousCustomers);
      }
      toast.error(
        error instanceof Error 
          ? error.message 
          : "Unable to delete customer"
      );
    },
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["pets"] });
    }
  });

  // Set up real-time updates for both customers and their pets
  useEffect(() => {
    // Listen for customer updates
    const customerQuery = query(customersCollection);
    const customerUnsubscribe = onSnapshot(customerQuery, async (snapshot) => {
      const customers = snapshot.docs.map(doc => {
        const customerData = doc.data();
        return {
          id: doc.id,
          ...customerData,
          createdAt: customerData.createdAt 
            ? new Date(customerData.createdAt) 
            : undefined
        } as Customer;
      });

      // Update customers in cache
      queryClient.setQueryData(["customers"], customers);
    });

    // Listen for pet updates to keep pet counts in sync
    const petsCollection = collection(db, 'pets');
    const petsUnsubscribe = onSnapshot(petsCollection, async (snapshot) => {
      try {
        // Get current customers from cache
        const currentCustomers = queryClient.getQueryData<Customer[]>(["customers"]) || [];
        
        // Count pets for each customer
        const petCounts = new Map<string, number>();
        snapshot.docs.forEach(doc => {
          const pet = doc.data();
          if (pet.customerId) {
            const count = petCounts.get(pet.customerId) || 0;
            petCounts.set(pet.customerId, count + 1);
          }
        });

        // Update customers with new pet counts in Firestore
        const updatePromises = currentCustomers.map(async (customer) => {
          const newPetCount = petCounts.get(customer.id) || 0;
          
          // Only update if the pet count is different
          if (customer.petCount !== newPetCount) {
            try {
              await updateCustomerDoc(customer.id, { 
                petCount: newPetCount,
                updatedAt: new Date()
              });
            } catch (error) {
              console.error(`Failed to update pet count for customer ${customer.id}:`, error);
            }
          }
        });

        // Wait for all updates to complete
        await Promise.all(updatePromises);

        // Invalidate customers query to trigger a refetch
        queryClient.invalidateQueries({ queryKey: ["customers"] });
      } catch (error) {
        console.error('Error updating pet counts:', error);
      }
    });

    return () => {
      customerUnsubscribe();
      petsUnsubscribe();
    };
  }, [queryClient]);

  const customersQuery = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      try {
        console.log('FETCH_CUSTOMERS: Starting customer fetch');
        const querySnapshot = await getDocs(customersCollection);
        const customers = querySnapshot.docs.map(doc => {
          const customerData = doc.data();
          const customer = {
            id: doc.id,
            firebaseId: doc.id, // Explicitly add firebaseId for component usage
            ...customerData,
            // Ensure createdAt is a valid Date object
            createdAt: customerData.createdAt 
              ? new Date(customerData.createdAt) 
              : new Date(),
            petCount: customerData.petCount || 0,
            gender: customerData.gender || null
          } satisfies Customer;
          console.log('FETCH_CUSTOMERS: Processed customer:', {
            id: customer.id,
            firebaseId: customer.firebaseId,
            name: `${customer.firstName} ${customer.lastName}`
          });
          return customer;
        });

        console.log('USE CUSTOMERS: Fetched customers', {
          customerCount: customers.length,
          customerIds: customers.map(c => c.id),
          customerNames: customers.map(c => `${c.firstName} ${c.lastName}`)
        });

        return customers;
      } catch (error) {
        console.error('Error fetching customers:', error);
        throw error;
      }
    },
  });

  return {
    customers: customersQuery.data || [],
    customersQuery,
    addCustomerMutation,
    updateCustomerMutation,
    deleteCustomerMutationHook,
    isLoading: customersQuery.isLoading
  };
}
