import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDocs, onSnapshot, query, deleteDoc, doc, where, collection, Timestamp } from "firebase/firestore";
import { customersCollection, createCustomer, updateCustomer as updateCustomerDoc, deleteCustomerAndRelated } from "../lib/firestore";
import { useEffect } from "react";
import { db, database } from "../lib/firebase";
import { getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { ref, set, serverTimestamp } from "firebase/database";
import { toast } from '@/components/ui/use-toast';
import { 
  type Customer as CustomerType, 
  type InsertCustomer, 
  type FirestoreCustomerData,
  type CustomerWithTimestamp,
  type FirestoreTimestamp
} from '@/lib/types';


export function useCustomers() {
  const queryClient = useQueryClient();

  const addCustomerMutation = useMutation({
    mutationFn: async (customer: InsertCustomer) => {
      // Create user in Firebase Auth first
      const auth = getAuth();
      let userCredential;
      
      try {
        // Generate a temporary password using phone number
        const tempPassword = `${customer.phone.slice(-6)}@${Date.now()}`;
        
        userCredential = await createUserWithEmailAndPassword(
          auth,
          customer.email,
          tempPassword
        );
        
        // Send password reset email
        await sendPasswordResetEmail(auth, customer.email);
        
        console.log('Created Firebase Auth user:', userCredential.user.uid);
      } catch (error) {
        console.error('Error creating Firebase Auth user:', error);
        throw new Error('Failed to create user authentication');
      }

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

        // Create timestamp for consistent date handling
        const timestamp = new Date().toISOString();

        const id = await createCustomer({
          ...customer,
          firebaseId: userCredential.user.uid
          // petCount will be initialized in createCustomer function
        });
        
        // Set customer role in realtime database
        const db = getDatabase();
        await set(ref(db, `roles/${userCredential.user.uid}`), {
          role: 'customer',
          permissions: ['view_appointments', 'create_appointments', 'view_services'],
          updatedAt: serverTimestamp()
        });

        // Log successful creation
        console.log('ADD_CUSTOMER: Customer created successfully', { id });

        return {
          id,
          firebaseId: id,
          ...customer,
          petCount: 0,
          createdAt: timestamp,
          updatedAt: null
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
      toast({
        title: "Success",
        description: "Customer added successfully"
      });
    },
    onError: (error) => {
      console.error('ADD_CUSTOMER: Mutation error', { 
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error 
          ? error.message 
          : "Failed to add customer. Please try again."
      });
    }
  });

  const updateCustomerMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Omit<CustomerType, 'id' | 'firebaseId' | 'createdAt' | 'updatedAt'>> }) => {
      const timestamp = new Date().toISOString();
      
      // Create a clean update payload with proper types
      const updatePayload = {
        ...Object.entries(data).reduce((acc, [key, value]) => {
          if (value !== undefined) {
            // Only include defined values
            acc[key] = value;
          }
          return acc;
        }, {} as Record<string, any>),
        updatedAt: timestamp
      };
      
      await updateCustomerDoc(id, updatePayload);
      
      // Return the updated customer with correct types
      return {
        id,
        firebaseId: id,
        ...data,
        updatedAt: timestamp
      } as unknown as CustomerType;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast({
        title: "Success",
        description: "Customer updated successfully"
      });
    },
    onError: (error) => {
      console.error('UPDATE_CUSTOMER: Mutation error', { error });
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error 
          ? error.message 
          : "Failed to update customer"
      });
    }
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
      const previousCustomers = queryClient.getQueryData<CustomerType[]>(["customers"]);

      // Optimistically update the cache
      queryClient.setQueryData<CustomerType[]>(["customers"], old => 
        old?.filter(customer => customer.id !== String(deletedId)) || []
      );

      return { previousCustomers };
    },
    onSuccess: (deletedId) => {
      console.log('Delete mutation succeeded for customer:', deletedId);
      toast({
        title: "Success",
        description: "Customer deleted successfully"
      });
    },
    onError: (error, _, context) => {
      console.error('Delete mutation error:', error);
      // Rollback to the previous state
      if (context?.previousCustomers) {
        queryClient.setQueryData(["customers"], context.previousCustomers);
      }
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error 
          ? error.message 
          : "Unable to delete customer"
      });
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
        const data = doc.data();
        const processTimestamp = (timestamp: FirestoreTimestamp | string | null | undefined): string | null => {
          if (!timestamp) return null;
          if (typeof timestamp === 'string') return timestamp;
          if (timestamp instanceof Timestamp) {
            return timestamp.toDate().toISOString();
          }
          return null;
        };

        return {
          id: doc.id,
          firebaseId: doc.id,
          firstName: data.firstName as string,
          lastName: data.lastName as string,
          email: data.email as string,
          phone: data.phone as string,
          address: data.address as string | null,
          gender: (data.gender as "male" | "female" | "other" | null) ?? null,
          petCount: Number(data.petCount || 0),
          createdAt: processTimestamp(data.createdAt as FirestoreTimestamp) || new Date().toISOString(),
          updatedAt: processTimestamp(data.updatedAt as FirestoreTimestamp)
        } as CustomerType;
      });

      // Update customers in cache
      queryClient.setQueryData(["customers"], customers);
    });

    // Listen for pet updates to keep pet counts in sync
    const petsCollection = collection(db, 'pets');
    const petsUnsubscribe = onSnapshot(petsCollection, async (snapshot) => {
      try {
        // Get current customers from cache
        const currentCustomers = queryClient.getQueryData<CustomerType[]>(["customers"]) || [];
        
        // Count pets for each customer
        const petCounts = new Map<string, number>();
        snapshot.docs.forEach(doc => {
          const pet = doc.data();
          if (pet.customerId) {
            const count = petCounts.get(pet.customerId) || 0;
            petCounts.set(pet.customerId, count + 1);
          }
        });

        // Update customers in cache only, don't trigger Firestore updates
        const updatedCustomers = currentCustomers.map(customer => ({
          ...customer,
          petCount: petCounts.get(customer.id) || 0
        }));

        // Update cache without triggering a refetch
        queryClient.setQueryData(["customers"], updatedCustomers);
      } catch (error) {
        console.error('Error updating pet counts in cache:', error);
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
          const processTimestamp = (timestamp: FirestoreTimestamp | string | null | undefined): string | null => {
            if (!timestamp) return null;
            if (typeof timestamp === 'string') return timestamp;
            if (timestamp instanceof Timestamp) {
              return timestamp.toDate().toISOString();
            }
            return null;
          };

          const customer: CustomerType = {
            id: doc.id,
            firebaseId: doc.id,
            firstName: customerData.firstName as string,
            lastName: customerData.lastName as string,
            email: customerData.email as string,
            phone: customerData.phone as string,
            address: customerData.address as string | null,
            gender: (customerData.gender as "male" | "female" | "other" | null) || null,
            petCount: Number(customerData.petCount || 0),
            createdAt: processTimestamp(customerData.createdAt as FirestoreTimestamp) || new Date().toISOString(),
            updatedAt: processTimestamp(customerData.updatedAt as FirestoreTimestamp)
          };
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