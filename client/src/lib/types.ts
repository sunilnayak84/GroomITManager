import { z } from "zod";

export const customerSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  phone: z.string(),
  address: z.string().nullable(),
  gender: z.enum(["male", "female", "other"]).nullable(),
  petCount: z.number().default(0),
  createdAt: z.string(),
  updatedAt: z.string().nullable(),
  firebaseId: z.string().nullable(),
  name: z.string().optional(),
});

export const insertCustomerSchema = customerSchema.omit({ 
  id: true,
  petCount: true,
  createdAt: true,
  updatedAt: true,
  firebaseId: true 
});

// Customer types are inferred from the Zod schema
export type Customer = z.infer<typeof customerSchema>;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

export const petSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["dog", "cat", "bird", "fish", "other"]),
  breed: z.string(),
  customerId: z.string(),
  dateOfBirth: z.string().nullable(),
  age: z.number().nullable(),
  gender: z.enum(["male", "female", "unknown"]).nullable(),
  weight: z.string().nullable(),
  weightUnit: z.enum(["kg", "lbs"]),
  image: z.string().nullable(),
  notes: z.string().nullable(),
  owner: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().nullable()
  }).nullable(),
  createdAt: z.string(),
  updatedAt: z.string().nullable()
});

export type Pet = z.infer<typeof petSchema>;

// Schema for pet insertion
// Define owner type schema
export const ownerSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().nullable()
});

export type Owner = z.infer<typeof ownerSchema>;

export const insertPetSchema = petSchema
  .omit({ 
    id: true, 
    createdAt: true, 
    updatedAt: true 
  })
  .extend({
    image: z.union([z.string(), z.instanceof(File), z.null()]),
    submissionId: z.string().optional(),
    owner: ownerSchema.nullable()
  });

export type InsertPet = z.infer<typeof insertPetSchema>;

export const PetGenderEnum = {
  MALE: "male",
  FEMALE: "female",
  UNKNOWN: "unknown",
} as const;

export type PetGender = typeof PetGenderEnum[keyof typeof PetGenderEnum];

// Form data types
export type PetFormData = InsertPet;

// Common utility types
export type WithId<T> = T & { id: number };
