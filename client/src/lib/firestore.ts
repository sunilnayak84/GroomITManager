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
    await setDoc(customerRef, {
      ...customer,
      createdAt: new Date()
    });
    return customerRef.id;
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
    // First, get and delete all pets associated with this customer
    const petsQuery = query(petsCollection, where('customerId', '==', id));
    const petsSnapshot = await getDocs(petsQuery);
    
    // Delete all pets
    const petDeletions = petsSnapshot.docs.map(petDoc => 
      deleteDoc(doc(petsCollection, petDoc.id))
    );
    await Promise.all(petDeletions);
    
    // Then delete the customer
    await deleteDoc(doc(customersCollection, id.toString()));
    
    return true;
  } catch (error) {
    console.error('Error deleting customer and related data:', error);
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
