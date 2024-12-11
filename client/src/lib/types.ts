
import { z } from "zod";

export const customerSchema = z.object({
  id: z.string(),
  firebaseId: z.string().nullable(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  phone: z.string(),
  address: z.string().nullable(),
  gender: z.enum(["male", "female", "other"]).nullable(),
  petCount: z.number(),
  createdAt: z.string(),
  updatedAt: z.string().nullable(),
});

export type Customer = z.infer<typeof customerSchema>;
export type InsertCustomer = Omit<Customer, "id" | "firebaseId" | "petCount" | "createdAt" | "updatedAt">;

export type PetType = "dog" | "cat" | "bird" | "fish" | "other";
export type Gender = "male" | "female" | "unknown";
export type WeightUnit = "kg" | "lbs";

export type FirestoreDate = {
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
  name: z.string(),
  customerId: z.string(),
  breed: z.string(),
  dateOfBirth: z.string().nullable(),
  age: z.number().nullable(),
  gender: z.enum(["male", "female", "unknown"]).nullable(),
  weight: z.number().nullable(),
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

export type FirestorePet = Omit<Pet, "createdAt" | "updatedAt"> & {
  createdAt: FirestoreDate | string;
  updatedAt: FirestoreDate | string | null;
};

export type FirestoreCustomer = Omit<Customer, "createdAt" | "updatedAt" | "petCount"> & {
  createdAt: FirestoreDate | string;
  updatedAt: FirestoreDate | string | null;
  petCount: number;
};
