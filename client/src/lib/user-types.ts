import { z } from "zod";

export const SERVICE_CATEGORIES = ['grooming', 'spa', 'training'] as const;
export const PET_TYPES = ['dog', 'cat', 'bird', 'rabbit'] as const;

export const insertUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email format"),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Invalid Indian mobile number"),
  role: z.enum(["staff", "groomer", "admin"]),
  branchId: z.number().optional(),
  isGroomer: z.boolean().default(false),
  specialties: z.array(z.string()).optional(),
  petTypePreferences: z.array(z.string()).optional(),
  experienceYears: z.number().min(0).optional(),
  certifications: z.array(z.string()).optional(),
  availability: z.string().optional(),
  maxDailyAppointments: z.number().min(1).optional(),
  isActive: z.boolean().default(true),
});

export type User = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "staff" | "groomer" | "admin";
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
};

export type InsertUser = z.infer<typeof insertUserSchema>;
