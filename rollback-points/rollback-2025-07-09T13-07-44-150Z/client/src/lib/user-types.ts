import { z } from "zod";

export const SERVICE_CATEGORIES = ['grooming', 'spa', 'training', 'dog_walking'] as const;
export const PET_TYPES = ['dog', 'cat', 'bird', 'rabbit'] as const;

// Define the walking preferences schema
const walkingPreferencesSchema = z.object({
  maxDistance: z.number().min(1, "Maximum walking distance must be at least 1km").default(5),
  preferredAreas: z.array(z.string()).default([]),
  availableTimeSlots: z.array(z.string()).default([]),
  simultaneousWalks: z.number().min(1, "Must handle at least 1 walk").max(5, "Cannot exceed 5 simultaneous walks").default(1)
});

export const insertUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email format"),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Invalid Indian mobile number"),
  role: z.enum(["staff", "groomer", "admin", "pet_walker"]),
  branchId: z.number().optional(),
  specialties: z.array(z.string()).default([]),
  petTypePreferences: z.array(z.string()).optional(),
  experienceYears: z.number().min(0).optional(),
  certifications: z.array(z.string()).optional(),
  availability: z.string().optional(),
  maxDailyAppointments: z.number().min(1).optional(),
  isActive: z.boolean().default(true),
  password: z.string().min(8, "Password must be at least 8 characters").optional(), // Added password field
  walkingPreferences: walkingPreferencesSchema.nullable().default(null)
});

export type User = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "staff" | "groomer" | "admin" | "pet_walker";
  branchId?: number;
  isGroomer: boolean;
  specialties?: string[];
  petTypePreferences?: string[];
  experienceYears?: number;
  certifications?: string[];
  availability?: string;
  maxDailyAppointments?: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  walkingPreferences?: {
    maxDistance: number;
    preferredAreas: string[];
    availableTimeSlots: string[];
    simultaneousWalks: number;
  } | null;
};

export type InsertUser = z.infer<typeof insertUserSchema>;