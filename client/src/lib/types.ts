
import { z } from "zod";

export const customerSchema = z.object({
  id: z.number(),
  firebaseId: z.string().nullable(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  phone: z.string(),
  address: z.string().nullable(),
  gender: z.enum(["male", "female", "other"]).nullable(),
  petCount: z.number(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
});

export type Customer = z.infer<typeof customerSchema>;
export type InsertCustomer = Omit<Customer, "id" | "createdAt" | "updatedAt">;

export type PetType = "dog" | "cat" | "bird" | "fish" | "other";
export type Gender = "male" | "female" | "other" | "unknown";
export type WeightUnit = "kg" | "lbs";

export interface PetInput {
  name: string;
  type: PetType;
  breed: string;
  customerId: string;
  dateOfBirth?: string | null;
  age?: number | null;
  gender?: Gender | null;
  weight?: string | null;
  weightUnit?: WeightUnit;
  notes?: string | null;
  image?: string | File | null;
  submissionId?: string;
}

export type InsertPet = Omit<PetInput, "id">;

export const petSchema = z.object({
  id: z.number(),
  image: z.string().nullable(),
  type: z.string(),
  name: z.string(),
  customerId: z.string(),
  breed: z.string(),
  dateOfBirth: z.string().nullable(),
  age: z.number().nullable(),
  gender: z.string().nullable(),
  weight: z.string().nullable(),
  weightUnit: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string().nullable(),
  firebaseId: z.string().nullable(),
});

export type Pet = z.infer<typeof petSchema>;
export type InsertPet = Omit<Pet, "id" | "createdAt" | "firebaseId">;
