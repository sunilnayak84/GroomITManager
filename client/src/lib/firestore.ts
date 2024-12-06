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
    console.log('Starting deletion process for customer:', id);
    const customerId = id.toString();
    
    // First, verify the customer exists
    const customerRef = doc(customersCollection, customerId);
    const customerDoc = await getDoc(customerRef);
    
    if (!customerDoc.exists()) {
      console.error('Customer not found:', customerId);
      throw new Error('Customer not found');
    }

    // Get all pets associated with this customer
    const petsQuery = query(petsCollection, where('customerId', '==', parseInt(customerId)));
    const petsSnapshot = await getDocs(petsQuery);
    
    console.log(`Found ${petsSnapshot.docs.length} pets to delete for customer:`, customerId);

    if (petsSnapshot.docs.length > 0) {
      // Delete all pets first
      for (const petDoc of petsSnapshot.docs) {
        try {
          console.log('Deleting pet:', petDoc.id);
          await deleteDoc(doc(petsCollection, petDoc.id));
          console.log('Successfully deleted pet:', petDoc.id);
        } catch (error) {
          console.error('Failed to delete pet:', petDoc.id, error);
          throw new Error(`Failed to delete pet: ${petDoc.id}`);
        }
      }
      console.log('All pets deleted successfully');
    }

    // Delete the customer
    try {
      console.log('Deleting customer:', customerId);
      await deleteDoc(customerRef);
      
      // Verify customer deletion
      const verifyDoc = await getDoc(customerRef);
      if (verifyDoc.exists()) {
        throw new Error('Customer document still exists after deletion');
      }
      console.log('Customer deleted successfully:', customerId);
      return true;
    } catch (error) {
      console.error('Error deleting customer:', customerId, error);
      throw new Error('Failed to delete customer');
    }
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
