import { z } from 'zod';

// Define specialties and pet type preferences as constants
export const GROOMER_SPECIALTIES = [
  'basic_grooming',
  'breed_specific_cuts',
  'hand_stripping',
  'show_grooming',
  'cat_grooming',
  'puppy_grooming',
  'senior_pet_grooming',
  'medicated_baths',
  'nail_trimming',
  'teeth_cleaning'
] as const;

export const PET_TYPE_PREFERENCES = [
  'dogs_small',
  'dogs_medium',
  'dogs_large',
  'cats',
  'rabbits',
  'other_small_pets'
] as const;

export type GroomerSpecialty = typeof GROOMER_SPECIALTIES[number];
export type PetTypePreference = typeof PET_TYPE_PREFERENCES[number];

// Base schema for common staff fields
const baseStaffSchema = {
  id: z.string().optional(),
  email: z.string().email("Valid email is required"),
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  isActive: z.boolean().default(true),
  branchId: z.string().nullable().default(null),
  managedBranchIds: z.array(z.string()).default([]),
  isMultiBranchEnabled: z.boolean().default(false),
  primaryBranchId: z.string().nullable().default(null),
  createdAt: z.union([
    z.string(),
    z.number(),
    z.null()
  ]).transform(val => {
    if (!val) return Date.now();
    if (typeof val === 'number') return val;
    return new Date(val).getTime();
  }),
  updatedAt: z.union([
    z.string(),
    z.number(),
    z.null()
  ]).transform(val => {
    if (!val) return null;
    if (typeof val === 'number') return val;
    return new Date(val).getTime();
  }).nullable()
};

// Schema specifically for groomers
const groomerSpecificSchema = {
  experienceYears: z.number().min(0, "Experience years must be non-negative").default(0),
  maxDailyAppointments: z.number().min(1, "Must accept at least 1 appointment per day").max(20, "Cannot exceed 20 appointments per day").default(8),
  specialties: z.array(z.enum(GROOMER_SPECIALTIES)).default([]),
  petTypePreferences: z.array(z.enum(PET_TYPE_PREFERENCES)).default([]),
  hourlyRate: z.number().min(0, "Hourly rate must be non-negative").optional(),
  bio: z.string().optional(),
  certifications: z.array(z.string()).default([])
};

// Combined schema for all staff members
export const staffSchema = z.object({
  ...baseStaffSchema,
  role: z.enum(['staff', 'groomer']),
  isGroomer: z.boolean().default(false),
  ...groomerSpecificSchema
});

// TypeScript types derived from the schema
export type Staff = z.infer<typeof staffSchema>;
export type InsertStaff = Omit<Staff, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateStaff = Partial<InsertStaff> & { id: string };

// Groomer-specific type
export type Groomer = Staff & {
  role: 'groomer';
  isGroomer: true;
  experienceYears: number;
  specialties: GroomerSpecialty[];
  petTypePreferences: PetTypePreference[];
};

// Type guards
export function isGroomer(staff: Staff): staff is Groomer {
  return staff.role === 'groomer' || staff.isGroomer;
}

// Helper functions
export function getAvailableGroomers(staffMembers: Staff[]): Groomer[] {
  return staffMembers.filter((staff): staff is Groomer => 
    isGroomer(staff) && staff.isActive
  );
}

export function getSpecialtyLabel(specialty: GroomerSpecialty): string {
  return specialty
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function getPetTypeLabel(petType: PetTypePreference): string {
  return petType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
