import { z } from "zod";

// Schema for Customer
export const customerSchema = z.object({
  id: z.string(),
  firebaseId: z.string().nullable(),
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Invalid email format"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  address: z.string().nullable(),
  gender: z.enum(["male", "female", "other"]).nullable(),
  petCount: z.number().default(0),
  createdAt: z.date(),
  updatedAt: z.date().optional(),
});

export const insertCustomerSchema = customerSchema.omit({
  id: true,
  firebaseId: true,
  petCount: true,
  createdAt: true,
  updatedAt: true,
});

// Schema for Pet
export const petSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["dog", "cat", "other"]),
  breed: z.string(),
  customerId: z.string(),
  dateOfBirth: z.string().nullable(),
  age: z.number().nullable(),
  gender: z.enum(["male", "female", "other"]).nullable(),
  weight: z.string().nullable(),
  weightUnit: z.enum(["kg", "lbs"]).default("kg"),
  height: z.string().nullable(),
  heightUnit: z.enum(["cm", "inches"]).default("cm"),
  image: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date().optional(),
});

export const insertPetSchema = z.object({
  name: z.string().min(1, "Pet name is required"),
  type: z.enum(["dog", "cat", "bird", "fish", "other"]),
  breed: z.string().min(1, "Pet breed is required"),
  customerId: z.number().min(1, "Customer must be selected"),
  dateOfBirth: z.string().nullable(),
  age: z.number().nullable(),
  gender: z.enum(["male", "female", "unknown"]).nullable(),
  weight: z.string().nullable(),
  weightUnit: z.enum(["kg", "lbs"]).default("kg"),
  image: z.string().nullable(),
  notes: z.string().nullable(),
});

// Schema for Appointment
export const appointmentSchema = z.object({
  id: z.string(),
  petId: z.number(),
  serviceId: z.number(),
  groomerId: z.number(),
  branchId: z.number(),
  date: z.date(),
  status: z.enum(["pending", "confirmed", "completed", "cancelled"]),
  notes: z.string().nullable(),
  productsUsed: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date().optional(),
});

export const insertAppointmentSchema = appointmentSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  date: z.date().min(new Date(), "Appointment date must be in the future"),
  petId: z.number().min(1, "Pet must be selected"),
  serviceId: z.number().min(1, "Service must be selected"),
  groomerId: z.number().min(1, "Groomer must be selected"),
  branchId: z.number().min(1, "Branch must be selected"),
});

// Schema for User (Groomer)
export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: z.enum(["admin", "groomer"]),
  branchId: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date().optional(),
});

export const insertUserSchema = userSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type Customer = z.infer<typeof customerSchema>;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Pet = z.infer<typeof petSchema>;
export type InsertPet = z.infer<typeof insertPetSchema>;
export type Appointment = z.infer<typeof appointmentSchema>;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type User = z.infer<typeof userSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;

// Additional types for appointments with relations
export type AppointmentWithRelations = Appointment & {
  pet: {
    name: string;
    breed: string;
    image: string | null;
  };
  customer: {
    firstName: string;
    lastName: string;
  };
  groomer: {
    name: string;
  };
};
