import { z } from "zod";

// Schema for Customer
export const customerSchema = z.object({
  id: z.number(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  phone: z.string(),
  address: z.string().nullable(),
  gender: z.enum(["male", "female", "other"]).nullable(),
  firebaseId: z.string().nullable(),
  petCount: z.number().default(0),
  createdAt: z.date(),
  updatedAt: z.date().optional(),
});

export const insertCustomerSchema = customerSchema.omit({
  id: true,
  petCount: true,
  createdAt: true,
  updatedAt: true,
});

// Schema for Pet
export const petSchema = z.object({
  id: z.number(),
  name: z.string(),
  type: z.enum(["dog", "cat", "bird", "fish", "other"]),
  breed: z.string(),
  customerId: z.number(),
  firebaseId: z.string().nullable(),
  dateOfBirth: z.string().nullable(),
  age: z.number().nullable(),
  gender: z.enum(["male", "female", "unknown"]).nullable(),
  weight: z.string().nullable(),
  weightUnit: z.enum(["kg", "lbs"]).default("kg"),
  image: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.date().nullable(),
  updatedAt: z.date().nullable(),
});

export const insertPetSchema = petSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Schema for Appointment
export const appointmentSchema = z.object({
  id: z.string(),
  petId: z.string(),
  serviceId: z.string(),
  groomerId: z.string(),
  branchId: z.string(),
  date: z.date(),
  status: z.enum(["pending", "confirmed", "completed", "cancelled"]),
  notes: z.string().nullable(),
  productsUsed: z.string().nullable(),
  createdAt: z.date().nullable(),
  updatedAt: z.date().nullable(),
});

export const insertAppointmentSchema = appointmentSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Schema for Service
export const serviceSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  duration: z.number(),
  price: z.number(),
  createdAt: z.date(),
  updatedAt: z.date().optional(),
});

export const insertServiceSchema = serviceSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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
export type Service = z.infer<typeof serviceSchema>;
export type InsertService = z.infer<typeof insertServiceSchema>;
export type User = z.infer<typeof userSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;

// Additional types for appointments with relations
export type AppointmentWithRelations = Appointment & {
  pet: {
    name: string;
    breed: string;
    image: string | null;
    customer: Customer;
  };
  service: {
    name: string;
    duration: number;
    price: number;
  };
  groomer: {
    name: string;
  };
};
