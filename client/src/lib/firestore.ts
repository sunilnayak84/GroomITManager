import { collection, doc, setDoc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';
import type { User, Customer, Pet, Appointment } from '@db/schema';

// Collection references
export const usersCollection = collection(db, 'users');
export const customersCollection = collection(db, 'customers');
export const petsCollection = collection(db, 'pets');
export const appointmentsCollection = collection(db, 'appointments');

// User operations
export async function createUserDocument(user: User) {
  const userRef = doc(usersCollection, user.id);
  await setDoc(userRef, {
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: new Date()
  });
}

// Customer operations
export async function createCustomer(customer: Omit<Customer, 'id'>) {
  const customerRef = doc(customersCollection);
  await setDoc(customerRef, {
    ...customer,
    createdAt: new Date()
  });
  return customerRef.id;
}

// Pet operations
export async function createPet(pet: Omit<Pet, 'id'>) {
  const petRef = doc(petsCollection);
  await setDoc(petRef, {
    ...pet,
    createdAt: new Date()
  });
  return petRef.id;
}

// Appointment operations
export async function createAppointment(appointment: Omit<Appointment, 'id'>) {
  const appointmentRef = doc(appointmentsCollection);
  await setDoc(appointmentRef, {
    ...appointment,
    createdAt: new Date()
  });
  return appointmentRef.id;
}
