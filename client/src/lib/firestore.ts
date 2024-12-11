import { 
  collection, doc, setDoc, getDoc, getDocs, deleteDoc, query, 
  where, DocumentData, CollectionReference, runTransaction,
  QuerySnapshot, DocumentSnapshot, WithFieldValue, 
  FieldValue, serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';
import type { User, Customer, Pet, Appointment } from './schema';
import { FirebaseError } from 'firebase/app';

// Helper to type the collections with WithFieldValue
function typedCollection<T = DocumentData>(collectionName: string): CollectionReference<WithFieldValue<T>> {
  return collection(db, collectionName) as CollectionReference<WithFieldValue<T>>;
}

// Collection references with proper typing
export const usersCollection = typedCollection<User>('users');
export const customersCollection = typedCollection<Customer>('customers');
export const petsCollection = typedCollection<Pet>('pets');
export const appointmentsCollection = typedCollection<Appointment>('appointments');

// Type guard for Firebase errors
function isFirebaseError(error: unknown): error is FirebaseError {
  return error instanceof FirebaseError;
}

// User operations with error handling
export async function createUserDocument(user: User) {
  try {
    const userRef = doc(usersCollection, user.id);
    const timestamp = new Date().toISOString();
    
    const userData: WithFieldValue<User> = {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone || null,
      role: user.role,
      isActive: true,
      branchId: user.branchId || null,
      isGroomer: false,
      specialties: [],
      petTypePreferences: [],
      experienceYears: null,
      certifications: [],
      availability: null,
      maxDailyAppointments: null,
      createdAt: timestamp,
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
export async function createCustomer(customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'firebaseId' | 'petCount'>) {
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
    const timestamp = new Date().toISOString();
    
    // Prepare customer data for Firestore with proper types
    const customerData: WithFieldValue<Customer> = {
      id: customerRef.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone,
      address: customer.address || null,
      gender: customer.gender || null,
      petCount: 0,
      firebaseId: null,
      createdAt: timestamp,
      updatedAt: null
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
export async function createPet(pet: Omit<Pet, 'id' | 'createdAt' | 'updatedAt' | 'firebaseId'>) {
  try {
    console.log('FIRESTORE: Attempting to create pet', { pet });

    // Validate input
    if (!pet) {
      throw new Error('Pet data is undefined');
    }

    // Ensure required fields are present
    const requiredFields = ['name', 'type', 'breed', 'customerId'] as const;
    for (const field of requiredFields) {
      const value = pet[field];
      if (!value) {
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
        const duplicateSnapshot = await getDocs(duplicateQuery);
        
        if (!duplicateSnapshot.empty) {
          console.log('FIRESTORE: Duplicate submission detected', {
            submissionId
          });
          const duplicateDoc = duplicateSnapshot.docs[0];
          const duplicateData = duplicateDoc.data() as Pet;
          return { 
            isDuplicate: true, 
            existingPet: { 
              ...duplicateData,
              id: duplicateDoc.id
            } 
          };
        }

        // Query existing pets for accurate count
        const petsQuery = query(petsCollection, where('customerId', '==', pet.customerId));
        const petsSnapshot = await getDocs(petsQuery);
        const actualPetCount = petsSnapshot.size;
        
        const timestamp = new Date().toISOString();
        const petData: WithFieldValue<Pet> = {
          id: petRef.id,
          firebaseId: null,
          name: pet.name,
          type: pet.type,
          breed: pet.breed,
          customerId: pet.customerId,
          dateOfBirth: pet.dateOfBirth || null,
          age: pet.age || null,
          gender: pet.gender || null,
          weight: pet.weight || null,
          weightUnit: pet.weightUnit || 'kg',
          notes: pet.notes || null,
          image: pet.image || null,
          submissionId,
          createdAt: timestamp,
          updatedAt: null,
          owner: pet.owner || null
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
          pet: petData
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
export async function createAppointment(appointment: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>) {
  try {
    const appointmentRef = doc(appointmentsCollection);
    const timestamp = new Date().toISOString();
    
    const appointmentData: WithFieldValue<Appointment> = {
      id: appointmentRef.id,
      petId: appointment.petId,
      serviceId: appointment.serviceId,
      groomerId: appointment.groomerId,
      branchId: appointment.branchId,
      date: appointment.date,
      status: appointment.status,
      notes: appointment.notes || null,
      productsUsed: appointment.productsUsed || null,
      createdAt: timestamp,
      updatedAt: null
    };

    await setDoc(appointmentRef, appointmentData);
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
    const timestamp = new Date().toISOString();
    
    // Create a type-safe processed data object
    const processedData = Object.entries(data).reduce<Record<string, unknown>>((acc, [key, value]: [string, unknown]) => {
      if (value !== undefined) {
        if (value && typeof value === 'object' && 'getTime' in value && typeof value.getTime === 'function') {
          // Safe check for Date objects
          acc[key] = (value as Date).toISOString();
        } else if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
          acc[key] = value;
        } else {
          acc[key] = value;
        }
      }
      return acc;
    }, {});

    // Add the timestamp to processed data
    processedData.updatedAt = timestamp;

    await setDoc(customerRef, processedData, { merge: true });
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
    
    // Create a type-safe version of the update data
    const cleanedData = Object.entries(data).reduce<Record<string, unknown>>((acc, [key, value]) => {
      if (value !== undefined) {
        if (value instanceof Date) {
          acc[key] = value.toISOString();
        } else if (value instanceof File) {
          // Handle File objects separately if needed
          acc[key] = value;
        } else {
          acc[key] = value;
        }
      }
      return acc;
    }, { updatedAt: timestamp });

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

export async function updateAppointment(id: string, data: Partial<Appointment>) {
  try {
    const appointmentRef = doc(appointmentsCollection, id);
    const timestamp = new Date().toISOString();
    
    const processedData = Object.entries(data).reduce<Record<string, unknown>>((acc, [key, value]) => {
      if (value !== undefined) {
        // Convert any date strings to ISO format
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
          acc[key] = value;
        } else {
          acc[key] = value;
        }
      }
      return acc;
    }, {});

    // Add the timestamp to processed data
    processedData.updatedAt = timestamp;

    await setDoc(appointmentRef, processedData, { merge: true });
    return true;
  } catch (error) {
    console.error('Error updating appointment:', error);
    throw error;
  }
}