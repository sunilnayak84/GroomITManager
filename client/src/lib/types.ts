import { z } from "zod";
import { customerSchema, insertCustomerSchema, petSchema, insertPetSchema } from "@db/schema";

// Customer types
export type Customer = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string | null;
  gender: string | null;
  petCount: number;
  createdAt: string;
  updatedAt: string | null;
  firebaseId?: string | null;
};

export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

// Pet types
export type Pet = {
  id: string;
  name: string;
  type: "dog" | "cat" | "bird" | "fish" | "other";
  breed: string;
  customerId: string;  // Firebase document ID
  dateOfBirth: string | null;
  age: number | null;
  gender: "male" | "female" | "unknown" | null;
  weight: string | null;
  weightUnit: "kg" | "lbs";
  image: string | null;
  notes: string | null;
  owner: {
    id: string;  // Firebase document ID
    name: string;
    email: string | null;
  } | null;
  createdAt: string;
  updatedAt: string | null;
};

export type InsertPet = {
  name: string;
  type: "dog" | "cat" | "bird" | "fish" | "other";
  breed: string;
  customerId: string;
  dateOfBirth: string | null;
  age: number | null;
  gender: "male" | "female" | "unknown" | null;
  weight: string | null;
  weightUnit: "kg" | "lbs";
  image: string | File | null;
  notes: string | null;
  owner: {
    id: string;
    name: string;
    email: string | null;
  } | null;
};

export const PetGenderEnum = {
  MALE: "male",
  FEMALE: "female",
  UNKNOWN: "unknown",
} as const;

export type PetGender = typeof PetGenderEnum[keyof typeof PetGenderEnum];

// Form data types
export type PetFormData = Omit<Pet, 'id'> & {
  id?: string;
  image?: File | string | null;
  owner?: {
    id: string;
    firstName: string;
    lastName: string;
    phone?: string;
    email?: string;
  } | null;
};

export type InsertPet = Omit<Pet, 'id' | 'createdAt' | 'updatedAt' | 'firebaseId'> & {
  image: string | File | null;
  submissionId?: string;
};

// Common utility types
export type WithId<T> = T & { id: number };
