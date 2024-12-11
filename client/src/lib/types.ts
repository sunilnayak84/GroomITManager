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

// Type for Firestore document with optional ID
export type WithOptionalId<T extends DocumentData> = Omit<T, 'id'> & {
  id?: string;
};

// Helper type for Firestore operations
export type FirestoreData<T> = Omit<T, 'id'> & {
  id?: string;
  createdAt?: FirestoreTimestamp | string;
  updatedAt?: FirestoreTimestamp | string | null;
};

// Helper to convert Firestore timestamp to ISO string
export function timestampToString(timestamp: FirestoreTimestamp | string | null | undefined): string | null {
  if (!timestamp) return null;
  if (typeof timestamp === 'string') return timestamp;
  return timestamp.toDate().toISOString();
}

export function convertToFirestoreTimestamp(date: Date | string | Timestamp | null): Timestamp | null {
  if (!date) return null;
  if (date instanceof Timestamp) return date;
  if (date instanceof Date) return Timestamp.fromDate(date);
  try {
    return Timestamp.fromDate(new Date(date));
  } catch {
    return null;
  }
}

// Customer schemas and types
export const customerSchema = z.object({
  id: z.string(),
  firebaseId: z.string().nullable(),
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Invalid email format"),
  phone: z.string().regex(/^[0-9]{10,}$/, "Phone number must be at least 10 digits"),
  address: z.string().nullable(),
  gender: z.enum(["male", "female", "other"]).nullable(),
  petCount: z.number().default(0),
  createdAt: z.string(),
  updatedAt: z.string().nullable(),
});

export type Customer = z.infer<typeof customerSchema>;
export type InsertCustomer = Omit<Customer, "id" | "firebaseId" | "petCount" | "createdAt" | "updatedAt">;

// Helper type for Firestore data
export type FirestoreCustomerData = Omit<Customer, "id"> & {
  id?: string;
};

export type PetType = "dog" | "cat" | "bird" | "fish" | "other";
export type Gender = "male" | "female" | "unknown" | "other";
export type WeightUnit = "kg" | "lbs";

export interface PetInput {
  name: string;
  type: PetType;
  breed: string;
  customerId: string;
  dateOfBirth?: string | null;
  age?: number | null;
  gender?: Gender | null;
  weight?: number | null;
  weightUnit?: WeightUnit;
  notes?: string | null;
  image?: string | File | null;
  submissionId?: string;
  owner?: {
    id: string;
    name: string;
    email: string | null;
  } | null;
}

export const petSchema = z.object({
  id: z.string(),
  firebaseId: z.string().nullable(),
  image: z.string().nullable(),
  type: z.enum(["dog", "cat", "bird", "fish", "other"]),
  name: z.string().min(1, "Name is required"),
  customerId: z.string(),
  breed: z.string().min(1, "Breed is required"),
  dateOfBirth: z.string().nullable(),
  age: z.number().nullable(),
  gender: z.enum(["male", "female", "unknown", "other"]).nullable(),
  weight: z.union([z.number(), z.string()]).transform(val => 
    typeof val === 'string' ? parseFloat(val) || null : val
  ).nullable(),
  weightUnit: z.enum(["kg", "lbs"]).default("kg"),
  notes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string().nullable(),
  submissionId: z.string().optional(),
  owner: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().nullable()
  }).nullable()
});

export type Pet = z.infer<typeof petSchema>;
export type InsertPet = Omit<PetInput, "id" | "submissionId"> & {
  submissionId?: string;
  firebaseId?: string | null;
};

export type FirestorePet = {
  id: string;
  firebaseId: string | null;
  name: string;
  type: PetType;
  breed: string;
  customerId: string;
  dateOfBirth: string | null;
  age: number | null;
  gender: Gender | null;
  weight: number | null;
  weightUnit: WeightUnit;
  notes: string | null;
  image: string | null;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp | null;
  submissionId?: string;
  owner: {
    id: string;
    name: string;
    email: string | null;
  } | null;
};

export type FirestoreCustomer = WithFirestoreTimestamp<Omit<Customer, "petCount" | "gender">> & {
  petCount: number;
  gender: Gender | null;
};
