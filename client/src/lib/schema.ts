import { z } from "zod";
import { Timestamp } from 'firebase/firestore';
import { FirestoreTimestamp, toISOString } from './types';

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
  createdAt: z.union([
    z.string(),
    z.custom<FirestoreTimestamp>((data) => data instanceof Timestamp),
    z.date()
  ]).transform(val => {
    if (val instanceof Date) return val.toISOString();
    return toISOString(val) || new Date().toISOString();
  }),
  updatedAt: z.union([
    z.string(),
    z.custom<FirestoreTimestamp>((data) => data instanceof Timestamp),
    z.date(),
    z.null()
  ]).transform(val => {
    if (val instanceof Date) return val.toISOString();
    return toISOString(val);
  }).nullable(),
});

export const insertCustomerSchema = customerSchema.omit({
  id: true,
  firebaseId: true,
  petCount: true,
  createdAt: true,
  updatedAt: true
});

// Re-export types from types.ts for convenience
export type { FirestoreTimestamp, FirestoreDate, WithFirestoreTimestamp, FirestoreData } from './types';

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
  gender: z.enum(["male", "female", "other", "unknown"]).nullable(),
  weight: z.number().nullable(),
  weightUnit: z.enum(["kg", "lbs"]).default("kg"),
  image: z.union([z.string(), z.instanceof(File)]).nullable(),
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
// Schema for appointment services
export const appointmentServiceSchema = z.object({
  id: z.string(),
  appointmentId: z.string(),
  serviceId: z.string().min(1, "Service must be selected"),
  price: z.number(),
  duration: z.number(),
  notes: z.string().nullable(),
});

export const appointmentSchema = z.object({
  id: z.string(),
  petId: z.string().min(1, "Pet must be selected"),
  services: z.array(z.string()).min(1, "At least one service must be selected"),
  groomerId: z.string().min(1, "Groomer must be selected"),
  branchId: z.string().min(1, "Branch must be selected"),
  appointmentDate: z.string().refine(
    (date) => {
      if (!date) return false;
      const appointmentDate = new Date(date);
      return !isNaN(appointmentDate.getTime());
    },
    "Please select a valid date"
  ),
  appointmentTime: z.string().refine(
    (time) => {
      if (!time) return false;
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      return timeRegex.test(time);
    },
    "Please select a valid time"
  ),
  status: z.enum(["pending", "confirmed", "completed", "cancelled"]),
  notes: z.string().nullable(),
  productsUsed: z.string().nullable(),
  totalPrice: z.number(),
  totalDuration: z.number(),
  createdAt: z.string(),
  updatedAt: z.string().nullable(),
});

// Helper type for Firebase compatibility
export type FirestoreAppointment = z.infer<typeof appointmentSchema>;

// Schema for appointment creation/updates
export const insertAppointmentSchema = z.object({
  petId: z.string().min(1, "Pet must be selected"),
  services: z.array(z.string()).min(1, "At least one service must be selected"),
  groomerId: z.string().min(1, "Groomer must be selected"),
  branchId: z.string().min(1, "Branch must be selected"),
  date: z.string().min(1, "Date must be selected"),
  time: z.string().refine(
    (time) => {
      if (!time) return false;
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      return timeRegex.test(time);
    },
    "Please select a valid time"
  ),
  status: z.enum(["pending", "confirmed", "completed", "cancelled"]).default("pending"),
  notes: z.string().nullable(),
  productsUsed: z.string().nullable(),
  totalPrice: z.number().optional(),
  totalDuration: z.number().optional()
});

// Schema for User (Groomer)
export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  phone: z.string().nullable(),
  role: z.enum(["admin", "groomer"]),
  isActive: z.boolean().default(true),
  branchId: z.string().nullable(),
  isGroomer: z.boolean().default(false),
  specialties: z.array(z.string()).default([]),
  petTypePreferences: z.array(z.string()).default([]),
  experienceYears: z.number().nullable(),
  certifications: z.array(z.string()).default([]),
  availability: z.string().nullable(),
  maxDailyAppointments: z.number().nullable(),
  createdAt: z.string(),
  updatedAt: z.string().nullable(),
});

export const insertUserSchema = userSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Helper type for Firebase compatibility
export type FirestoreUser = z.infer<typeof userSchema>;

// Types
// Helper type for Firebase compatibility
export type FirestoreCustomer = z.infer<typeof customerSchema>;

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string | null;
  gender: "male" | "female" | "other" | null;
  petCount: number;
  createdAt: string;
  updatedAt: string | null;
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
// Schema for Working Hours
export const workingDaysSchema = z.object({
  id: z.string(),
  branchId: z.number(),
  dayOfWeek: z.number().min(0).max(6),
  isOpen: z.boolean(),
  openingTime: z.string(),
  closingTime: z.string(),
  breakStart: z.string().nullable().optional(),
  breakEnd: z.string().nullable().optional(),
  maxDailyAppointments: z.number().default(8),
  createdAt: z.string(),
  updatedAt: z.string().nullable(),
});

export const insertWorkingDaysSchema = workingDaysSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  breakStart: z.string().optional(),
  breakEnd: z.string().optional(),
}).refine(
  (data) => {
    if ((data.breakStart && !data.breakEnd) || (!data.breakStart && data.breakEnd)) {
      return false;
    }
    return true;
  },
  {
    message: "Both break start and end times must be provided if one is set",
    path: ["breakTime"],
  }
).refine(
  (data) => {
    if (!data.breakStart || !data.breakEnd) return true;
    const breakStart = new Date(`1970-01-01T${data.breakStart}`);
    const breakEnd = new Date(`1970-01-01T${data.breakEnd}`);
    return breakEnd > breakStart;
  },
  {
    message: "Break end time must be after break start time",
    path: ["breakEnd"],
  }
).refine(
  (data) => {
    if (!data.isOpen) return true;
    const opening = new Date(`1970-01-01T${data.openingTime}`);
    const closing = new Date(`1970-01-01T${data.closingTime}`);
    return closing > opening;
  },
  {
    message: "Closing time must be after opening time",
    path: ["closingTime"],
  }
);

export type WorkingDays = z.infer<typeof workingDaysSchema>;
export type InsertWorkingDays = z.infer<typeof insertWorkingDaysSchema>;
export type AppointmentWithRelations = {
  id: string;
  petId: string;
  services: string[];
  groomerId: string;
  branchId: string;
  date: string;
  time?: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  notes: string | null;
  productsUsed: string | null;
  totalPrice: number;
  totalDuration: number;
  pet: {
    id: string;
    name: string;
    breed: string;
    type: string;
    gender: string | null;
    age: number | null;
    dateOfBirth: string | null;
    weight: number | null;
    weightUnit: string;
    notes: string | null;
    image: string | null;
    createdAt: string;
    updatedAt: string | null;
    customerId: string;
    firebaseId: string | null;
    owner: {
      id: string;
      name: string;
      email: string | null;
    } | null;
    submissionId?: string;
  };
  customer: {
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    gender: string | null;
    petCount: number;
  };
  groomer: {
    name: string;
  };
  service?: Array<{
    name: string;
    duration: number;
    price: number;
    description?: string | null;
    category?: string;
    discount_percentage?: number;
    consumables?: any[];
  }>;
  createdAt: string;
  updatedAt: string | null;
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
