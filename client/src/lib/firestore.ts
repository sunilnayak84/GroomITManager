import { collection, doc, setDoc, getDoc, getDocs, deleteDoc, query, where, DocumentData, CollectionReference } from 'firebase/firestore';
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
    const userRef = doc(usersCollection, user.id.toString());
    await setDoc(userRef, {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: new Date(),
      branchId: user.branchId || null
    });
    return true;
  } catch (error) {
    console.error('Error creating user document:', error);
    return false;
  }
}

// Customer operations with error handling
export async function createCustomer(customer: Omit<Customer, 'id'>) {
  try {
    const customerRef = doc(customersCollection);
    const customerId = parseInt(customerRef.id, 10) || Date.now(); // Fallback to timestamp if parsing fails
    
    // Ensure createdAt is a valid Date
    const createdAt = customer.createdAt instanceof Date 
      ? customer.createdAt 
      : (customer.createdAt ? new Date(customer.createdAt) : new Date());
    
    await setDoc(customerRef, {
      ...customer,
      id: customerId, // Ensure id is a number
      createdAt: createdAt.toISOString() // Store as ISO string for consistent serialization
    });
    
    return customerId;
  } catch (error) {
    console.error('Error creating customer:', error);
    throw error;
  }
}

// Pet operations with error handling
export async function createPet(pet: Omit<Pet, 'id'>) {
  try {
    const petRef = doc(petsCollection);
    await setDoc(petRef, {
      ...pet,
      createdAt: new Date()
    });
    return petRef.id;
  } catch (error) {
    console.error('Error creating pet:', error);
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
export async function updateCustomer(id: number, data: Partial<Customer>) {
  try {
    const customerRef = doc(customersCollection, id.toString());
    await setDoc(customerRef, {
      ...data,
      updatedAt: new Date()
    }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error updating customer:', error);
    throw error;
  }
}

export async function deleteCustomerAndRelated(id: number) {
  try {
    // Validate input
    if (isNaN(id) || id <= 0) {
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
        throw new Error(`Failed to delete pet: ${petDoc.id}`);
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

export async function updatePet(id: number, data: Partial<Pet>) {
  try {
    const petRef = doc(petsCollection, id.toString());
    await setDoc(petRef, {
      ...data,
      updatedAt: new Date()
    }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error updating pet:', error);
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
