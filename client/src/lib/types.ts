import { Timestamp } from 'firebase/firestore';

export type FirestoreTimestamp = Timestamp;
export type FirestoreDate = Date;

// Helper function for timestamp conversion
export function timestampToString(timestamp: FirestoreTimestamp | string | null | undefined): string | null {
  if (!timestamp) return null;
  if (typeof timestamp === 'string') return timestamp;
  return timestamp.toDate().toISOString();
}

// Helper type for Firestore operations
export type FirestoreData<T> = Omit<T, 'id'> & {
  id?: string;
  createdAt?: FirestoreTimestamp | string;
  updatedAt?: FirestoreTimestamp | string | null;
};

export type WithFirestoreTimestamp<T> = Omit<T, 'createdAt' | 'updatedAt'> & {
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp | null;
};

// Re-export types from schema
import type { Customer } from './schema';
export type { Pet, InsertPet, Customer, InsertCustomer, FirestoreCustomer as FirestoreCustomerData } from './schema';
export type CustomerWithTimestamp = WithFirestoreTimestamp<Customer>;
export function toISOString(date: FirestoreTimestamp | string | null | undefined): string | null {
  if (!date) return null;
  if (typeof date === 'string') return date;
  return date.toDate().toISOString();
}