
import { z } from "zod";
import { Timestamp, FieldValue, DocumentData } from 'firebase/firestore';

// Enhanced Firestore date types
export type FirestoreTimestamp = Timestamp;
export type FirestoreDate = FirestoreTimestamp;

// Type guards and utility functions
export function isFirestoreTimestamp(value: unknown): value is FirestoreTimestamp {
  return value instanceof Timestamp;
}

export function isFirestoreDate(value: unknown): value is FirestoreDate {
  return Boolean(
    value &&
    typeof value === 'object' &&
    value instanceof Timestamp
  );
}

// Helper to safely convert any value to a Date
export function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (typeof value === 'string') {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }
  return null;
}

// Helper to convert any value to an ISO string
export function toISOString(value: unknown): string | null {
  const date = toDate(value);
  return date ? date.toISOString() : null;
}

export type WithFirestoreTimestamp<T> = {
  [K in keyof T]: T[K] extends Date 
    ? FirestoreTimestamp | string | null 
    : T[K] extends Date | null 
      ? FirestoreTimestamp | string | null 
      : T[K];
};

// Helper type for Firestore document with optional ID
export type WithOptionalId<T extends DocumentData> = Omit<T, 'id'> & {
  id?: string;
};

// Helper type for Firestore operations
export type FirestoreData<T> = Omit<T, 'id'> & {
  id?: string;
  createdAt?: FirestoreTimestamp | string;
  updatedAt?: FirestoreTimestamp | string | null;
};

export type { Pet, InsertPet } from './schema';
export type { Customer, InsertCustomer } from './schema';
export type { FirestoreCustomerData, CustomerWithTimestamp } from './schema';
