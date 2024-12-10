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
  firebaseId: z.string().nullable(),
  name: z.string().min(1, "Pet name is required"),
  type: z.enum(["dog", "cat", "bird", "fish", "other"]),
  breed: z.string().min(1, "Pet breed is required"),
  customerId: z.string().min(1, "Customer must be selected"),
  dateOfBirth: z.string().nullable(),
  age: z.number().nullable(),
  gender: z.enum(["male", "female", "unknown"]).nullable(),
  weight: z.number().nullable(),
  weightUnit: z.enum(["kg", "lbs"]).default("kg"),
  image: z.union([z.string(), z.instanceof(File)]).nullable(),
  notes: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date().optional(),
  owner: z.object({
    id: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    name: z.string(),
    phone: z.string(),
    email: z.string()
  }).nullable()
});

export const insertPetSchema = petSchema.omit({
  id: true,
  firebaseId: true,
  createdAt: true,
  updatedAt: true
}).extend({
  submissionId: z.string().optional(),
  image: z.union([z.string(), z.instanceof(File)]).nullable()
});

// Schema for Appointment
export const appointmentSchema = z.object({
  id: z.string(),
  petId: z.number(),
  serviceId: z.number(),
  groomerId: z.string(),
  branchId: z.number(),
  date: z.date(),
  status: z.enum(["pending", "confirmed", "completed", "cancelled"]),
  notes: z.string().nullable(),
  productsUsed: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date().optional(),
});

// Schema for appointment creation/updates
export const insertAppointmentSchema = appointmentSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  date: z.date().min(new Date(), "Appointment date must be in the future"),
  petId: z.number().min(1, "Pet must be selected"),
  serviceId: z.number().min(1, "Service must be selected"),
  groomerId: z.string().min(1, "Groomer must be selected"),
  branchId: z.number().min(1, "Branch must be selected"),
  status: z.enum(["pending", "confirmed", "completed", "cancelled"]).default("pending"),
  notes: z.string().nullable(),
  productsUsed: z.string().nullable()
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
export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string | null;
  gender: "male" | "female" | "other" | null;
  petCount: number;
  createdAt: Date;
  updatedAt: Date | null;
  firebaseId: string | null;
  name?: string;
}

export interface ToastProps {
  success: (message: string) => void;
  error: (message: string) => void;
}

export type InsertCustomer = Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'firebaseId' | 'petCount'>;
export type Pet = z.infer<typeof petSchema>;
export type InsertPet = z.infer<typeof insertPetSchema>;
export type Appointment = z.infer<typeof appointmentSchema>;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type User = z.infer<typeof userSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;

// Additional types for appointments with relations
export type AppointmentWithRelations = Omit<Appointment, "status"> & {
  status: "pending" | "confirmed" | "completed" | "cancelled";
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
  service?: {
    name: string;
    duration: number;
    price: number;
  };
};

// Additional types for inventory usage
export const inventoryUsageSchema = z.object({
  usage_id: z.string(),
  item_id: z.string(),
  quantity_used: z.number().min(0, "Usage quantity must be positive"),
  service_id: z.string().optional(),
  appointment_id: z.string().optional(),
  used_by: z.string(),
  used_at: z.date(),
  notes: z.string().optional(),
});

export type InventoryUsage = z.infer<typeof inventoryUsageSchema>;
export type InsertInventoryUsage = Omit<InventoryUsage, "usage_id" | "used_at">;
