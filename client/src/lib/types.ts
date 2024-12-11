
import { z } from "zod";

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
export type Gender = "male" | "female" | "unknown";
export type WeightUnit = "kg" | "lbs";

export type FirestoreDate = {
  seconds: number;
  nanoseconds: number;
  toDate: () => Date;
};

export type FirestoreTimestamp = {
  toDate(): Date;
  seconds: number;
  nanoseconds: number;
};

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
  createdAt?: string;
  updatedAt?: string | null;
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

export type FirestorePet = Omit<Pet, "createdAt" | "updatedAt" | "weight"> & {
  createdAt: FirestoreDate | string;
  updatedAt: FirestoreDate | string | null;
  weight: string | number | null;
};

export type FirestoreCustomer = Omit<Customer, "createdAt" | "updatedAt" | "petCount" | "gender"> & {
  createdAt: FirestoreDate | string;
  updatedAt: FirestoreDate | string | null;
  petCount: number;
  gender: Gender | null;
};

// Type guard for FirestoreDate
export function isFirestoreDate(value: any): value is FirestoreDate {
  return value && typeof value === 'object' && 'seconds' in value && 'nanoseconds' in value;
}

// Type guard for Gender
export function isValidGender(value: any): value is Gender {
  return value === 'male' || value === 'female' || value === 'unknown';
}
