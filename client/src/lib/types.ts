import { z } from "zod";
import { customerSchema, insertCustomerSchema, petSchema, insertPetSchema } from "@db/schema";

// Customer types
export type Customer = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string | null;
  gender: string | null;
  petCount: number;
  createdAt: Date;
  updatedAt: Date | null;
  firebaseId?: string | null;
};

export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

// Pet types
export type Pet = {
  id: number;
  name: string;
  type: "dog" | "cat" | "bird" | "fish" | "other";
  breed: string;
  customerId: number;
  dateOfBirth: string | null;
  age: number | null;
  gender: "male" | "female" | "unknown" | null;
  weight: string | null;
  weightUnit: "kg" | "lbs";
  image: string | null;
  notes: string | null;
  owner?: {
    id: number;
    firstName: string;
    lastName: string;
    phone?: string;
    email?: string;
  };
  createdAt: Date;
  updatedAt: Date | null;
  firebaseId?: string | null;
};

export const PetGenderEnum = {
  MALE: "male",
  FEMALE: "female",
  UNKNOWN: "unknown",
} as const;

export type PetGender = typeof PetGenderEnum[keyof typeof PetGenderEnum];

// Form data types
export type PetFormData = Omit<Pet, 'id'> & {
  id?: number;
  image?: File | string | null;
  owner?: {
    id: number;
    firstName: string;
    lastName: string;
    phone?: string;
    email?: string;
  };
};

export type InsertPet = Omit<z.infer<typeof insertPetSchema>, 'id'> & {
  id?: number;
  firebaseId?: string | null;
  image?: string | null;
  imageUrl?: string | null;
  owner?: {
    id: number;
    firstName: string;
    lastName: string;
    phone?: string;
    email?: string;
  };
};

// Common utility types
export type WithId<T> = T & { id: number };