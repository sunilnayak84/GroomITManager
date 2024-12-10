import { collection, doc, setDoc, getDoc, getDocs, deleteDoc, query, where, DocumentData, CollectionReference, runTransaction } from 'firebase/firestore';
import { db } from './firebase';
import type { User, Customer, Pet, Appointment } from '@db/schema';

// Helper to type the collections
function typedCollection<T = DocumentData>(collectionName: string): CollectionReference<T> {
  return collection(db, collectionName) as CollectionReference<T>;
}

// Collection references with proper typing
export const usersCollection = typedCollection<User>('users');
export const customersCollection = typedCollection<Customer>('customers');
export const petsCollection = typedCollection<Pet>('pets');
export const appointmentsCollection = typedCollection<Appointment>('appointments');

// User operations with error handling
export async function createUserDocument(user: User) {
  try {
    const userRef = doc(usersCollection, user.id);
    const timestamp = new Date();
    
    const userData = {
      email: user.email,
      name: user.name,
      phone: user.phone || '',
      role: user.role,
      isActive: true,
      createdAt: timestamp,
      branchId: user.branchId || null,
      isGroomer: user.isGroomer || false,
      specialties: user.specialties || [],
      petTypePreferences: user.petTypePreferences || [],
      experienceYears: user.experienceYears || null,
      certifications: user.certifications || [],
      availability: user.availability || null,
      maxDailyAppointments: user.maxDailyAppointments || null,
      updatedAt: null
    };

    await setDoc(userRef, userData);
    return true;
  } catch (error) {
    console.error('Error creating user document:', error);
    return false;
  }
}

// Customer operations with error handling
export async function createCustomer(customer: Omit<Customer, 'id'>) {
  try {
    // Validate input
    if (!customer) {
      console.error('FIRESTORE: Customer data is undefined');
      throw new Error('Customer data cannot be empty');
    }

    // Validate required fields
    const requiredFields = ['firstName', 'lastName', 'email', 'phone'] as const;
    const missingFields = requiredFields.filter(field => !customer[field]);

    if (missingFields.length > 0) {
      console.error('FIRESTORE: Missing required customer fields', { 
        missingFields,
        customerData: customer
      });
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Create customer reference
    const customerRef = doc(customersCollection);
    const timestamp = new Date();
    
    // Prepare customer data for Firestore with proper types
    const customerData = {
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone,
      address: customer.address || null,
      gender: customer.gender || null,
      petCount: 0,
      firebaseId: null,
      createdAt: timestamp
    };

    // Log the data being saved
    console.log('FIRESTORE: Creating customer', { customerData });

    // Save to Firestore
    await setDoc(customerRef, customerData);
    
    console.log('FIRESTORE: Customer created successfully', { id: customerRef.id });
    return customerRef.id;
  } catch (error) {
    console.error('FIRESTORE: Error creating customer', { 
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      customer
    });
    throw error;
  }
}

// Pet operations with error handling and improved transaction logic
export async function createPet(pet: Omit<Pet, 'id'>) {
  try {
    console.log('FIRESTORE: Attempting to create pet', { pet });

    // Validate input
    if (!pet) {
      throw new Error('Pet data is undefined');
    }

    // Ensure required fields are present
    const requiredFields = ['name', 'type', 'breed', 'customerId'];
    for (const field of requiredFields) {
      if (!pet[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Create references
    const customerRef = doc(customersCollection, pet.customerId);
    const petRef = doc(petsCollection);
    const submissionId = pet.submissionId || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Use a transaction to create pet and update customer count atomically
    const result = await runTransaction(db, async (transaction) => {
      try {
        // Verify customer exists within transaction
        const customerDoc = await transaction.get(customerRef);
        if (!customerDoc.exists()) {
          throw new Error(`Customer with ID ${pet.customerId} does not exist`);
        }

        // Check for duplicate submission
        const duplicateQuery = query(petsCollection, where('submissionId', '==', submissionId));
        const duplicateSnapshot = await transaction.get(duplicateQuery);
        
        if (!duplicateSnapshot.empty) {
          console.log('FIRESTORE: Duplicate submission detected', {
            submissionId
          });
          const duplicateDoc = duplicateSnapshot.docs[0];
          return { 
            isDuplicate: true, 
            existingPet: { 
              id: duplicateDoc.id, 
              ...duplicateDoc.data() 
            } 
          };
        }

        // Query existing pets for accurate count
        const petsQuery = query(petsCollection, where('customerId', '==', pet.customerId));
        const petsSnapshot = await getDocs(petsQuery);
        const actualPetCount = petsSnapshot.size;
        
        const timestamp = new Date().toISOString();
        const petData = {
          ...pet,
          id: petRef.id,
          submissionId,
          createdAt: timestamp,
          updatedAt: timestamp
        };

        console.log('FIRESTORE: Creating new pet', { 
          petId: petRef.id,
          customerId: pet.customerId,
          petCount: actualPetCount + 1,
          petData
        });

        // Create pet document
        transaction.set(petRef, petData);

        // Update customer's pet count
        transaction.update(customerRef, {
          petCount: actualPetCount + 1,
          updatedAt: timestamp
        });

        return { 
          success: true, 
          pet: { 
            id: petRef.id, 
            ...petData 
          } 
        };
      } catch (error) {
        console.error('FIRESTORE: Transaction failed', error);
        throw error;
      }
    });

    console.log('FIRESTORE: Pet operation completed', result);
    return result;
  } catch (error) {
    console.error('FIRESTORE: Critical error in createPet', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      pet 
    });
    throw error;
  }
}

// Appointment operations with error handling
export async function createAppointment(appointment: Omit<Appointment, 'id'>) {
  try {
    const appointmentRef = doc(appointmentsCollection);
    await setDoc(appointmentRef, {
      ...appointment,
      createdAt: new Date()
    });
    return appointmentRef.id;
  } catch (error) {
    console.error('Error creating appointment:', error);
    throw error;
  }
}

// Add update and delete operations
export async function updateCustomer(id: string, data: Partial<Customer>) {
  try {
    const customerRef = doc(customersCollection, id);
    
    // Create a type-safe processed data object
    const processedData: Partial<Customer> & { updatedAt: string } = {
      ...data,
      updatedAt: new Date().toISOString()
    };

    // Handle date conversion if createdAt is present
    if (data.createdAt) {
      processedData.createdAt = data.createdAt instanceof Date 
        ? data.createdAt
        : new Date(data.createdAt);
    }

    // Create a clean object without undefined values
    const cleanedData = Object.entries(processedData).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key as keyof typeof processedData] = value;
      }
      return acc;
    }, {} as Partial<Customer> & { updatedAt: string });

    await setDoc(customerRef, cleanedData, { merge: true });
    return true;
  } catch (error) {
    console.error('Error updating customer:', error);
    throw error;
  }
}

export async function deleteCustomerAndRelated(id: string) {
  try {
    // Validate input
    if (!id || typeof id !== 'string') {
      console.error('Invalid customer ID:', id);
      throw new Error(`Invalid customer ID: ${id}`);
    }

    console.log('Starting deletion process for customer:', id);
    
    // First, check if the customer exists
    const customerQuery = query(
      customersCollection, 
      where('id', '==', id)
    );
    const customerSnapshot = await getDocs(customerQuery);
    
    if (customerSnapshot.empty) {
      console.error('Customer not found:', id);
      throw new Error(`Customer with ID ${id} not found`);
    }

    // Get the actual Firestore document reference
    const customerDocRef = customerSnapshot.docs[0].ref;

    // Find and delete associated pets
    const petsQuery = query(
      petsCollection, 
      where('customerId', '==', id)
    );
    const petsSnapshot = await getDocs(petsQuery);
    
    // Delete associated pets
    const petDeletionPromises = petsSnapshot.docs.map(async (petDoc) => {
      try {
        console.log('Deleting pet:', petDoc.id);
        await deleteDoc(petDoc.ref);
        console.log('Successfully deleted pet:', petDoc.id);
      } catch (error) {
        console.error('Failed to delete pet:', petDoc.id, error);
        // Continue with other deletions even if one fails
      }
    });

    // Wait for all pet deletions
    await Promise.all(petDeletionPromises);

    // Delete the customer document
    await deleteDoc(customerDocRef);
    
    console.log('Customer and associated pets deleted successfully:', id);
    return true;
  } catch (error) {
    console.error('Error in deleteCustomerAndRelated:', error);
    throw error;
  }
}

export async function updatePet(id: string, data: Partial<Pet>) {
  try {
    console.log('FIRESTORE: Starting pet update', { id, updateData: data });
    
    const petRef = doc(petsCollection, id);
    const petDoc = await getDoc(petRef);
    
    if (!petDoc.exists()) {
      throw new Error(`Pet with ID ${id} not found`);
    }

    const timestamp = new Date().toISOString();
    const updateData: Partial<Pet> & { updatedAt: string } = {
      ...data,
      updatedAt: timestamp
    };

    // Create a type-safe version of the update data
    const cleanedData = Object.entries(updateData).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key as keyof typeof updateData] = value;
      }
      return acc;
    }, {} as Partial<Pet> & { updatedAt: string });

    await setDoc(petRef, cleanedData, { merge: true });
    console.log('FIRESTORE: Pet updated successfully', { id, updateData: cleanedData });
    
    const currentData = petDoc.data();
    return {
      success: true,
      pet: {
        ...currentData,
        ...cleanedData,
        id // Keep id at the end to ensure it's not overwritten
      }
    };
  } catch (error) {
    console.error('FIRESTORE: Error updating pet:', error);
    throw error;
  }
}

export async function updateAppointment(id: number, data: Partial<Appointment>) {
  try {
    const appointmentRef = doc(appointmentsCollection, id.toString());
    await setDoc(appointmentRef, {
      ...data,
      updatedAt: new Date()
    }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error updating appointment:', error);
    throw error;
  }
}