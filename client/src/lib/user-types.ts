import { z } from "zod";

export const SERVICE_CATEGORIES = ['grooming', 'spa', 'training'] as const;
export const PET_TYPES = ['dog', 'cat', 'bird', 'rabbit'] as const;
export const STAFF_ROLES = ['admin', 'manager', 'staff', 'groomer'] as const;

// Base schema for all users
const baseUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email format"),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Invalid Indian mobile number").optional(),
  isActive: z.boolean().default(true),
});

// Staff-specific fields
const staffSpecificSchema = z.object({
  role: z.enum(STAFF_ROLES),
  isGroomer: z.boolean().default(false),
  specialties: z.array(z.string()).default([]),
  petTypePreferences: z.array(z.enum(PET_TYPES)).default([]),
  experienceYears: z.number().min(0).default(0),
  maxDailyAppointments: z.number().min(1).default(8),
  permissions: z.array(z.string()).default([]),
  branchId: z.string().optional(),
  firebaseUid: z.string().optional(),
});

// Schema for creating/inserting a new staff member
export const insertUserSchema = baseUserSchema.extend({
  ...staffSpecificSchema.shape,
  password: z.string().min(8).optional(), // Optional because we might generate it
});

// Full user type with all fields
export type User = z.infer<typeof baseUserSchema> &
  z.infer<typeof staffSpecificSchema> & {
    id: string;
    createdAt?: string;
    updatedAt?: string;
  };

export type InsertUser = z.infer<typeof insertUserSchema>;

// Role-specific types
export type StaffRole = typeof STAFF_ROLES[number];

// Staff member interface extending base User type
export interface StaffMember extends User {
  role: StaffRole;
  isGroomer: boolean;
  isActive: boolean;
  specialties: string[];
  petTypePreferences: typeof PET_TYPES[number][];
  experienceYears: number;
  maxDailyAppointments: number;
  branchId?: string;
  permissions: string[];
}

// Validation helpers
export const isValidRole = (role: unknown): role is StaffRole => 
  STAFF_ROLES.includes(role as StaffRole);

export const isValidPetType = (petType: unknown): petType is typeof PET_TYPES[number] =>
  PET_TYPES.includes(petType as typeof PET_TYPES[number]);

// Type guard for StaffMember
export const isStaffMember = (user: any): user is StaffMember => {
  return user && 
    typeof user.isGroomer === 'boolean' &&
    typeof user.isActive === 'boolean' &&
    Array.isArray(user.specialties) &&
    Array.isArray(user.petTypePreferences) &&
    typeof user.experienceYears === 'number' &&
    typeof user.maxDailyAppointments === 'number';
};
