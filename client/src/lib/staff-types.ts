
import { z } from 'zod';

export const STAFF_ROLES = ['staff', 'manager', 'receptionist'] as const;
export const STAFF_SPECIALTIES = ['groomer', 'walker', 'vet', 'boarder', 'trainer'] as const;

export type StaffRole = typeof STAFF_ROLES[number];
export type StaffSpecialty = typeof STAFF_SPECIALTIES[number];

export const staffSchema = z.object({
  id: z.string().optional(),
  email: z.string().email("Valid email is required"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().optional(),
  role: z.enum(STAFF_ROLES),
  specialties: z.array(z.enum(STAFF_SPECIALTIES)).default([]),
  isActive: z.boolean().default(true),
  maxDailyAppointments: z.number().min(1).max(20).default(8),
  branchId: z.string().nullable().default(null),
  createdAt: z.number().default(() => Date.now()),
  updatedAt: z.number().nullable().default(null)
});

export type Staff = z.infer<typeof staffSchema>;
export type InsertStaff = Omit<Staff, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateStaff = Partial<InsertStaff> & { id: string };
