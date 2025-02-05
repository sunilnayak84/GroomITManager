import { z } from "zod";
import { walkingServiceSchema, walkingRoutePointSchema } from "./service-types";

export const walkSessionSchema = z.object({
  id: z.string(),
  serviceId: z.string(),
  walkerId: z.string(),
  petId: z.string(),
  customerId: z.string(),
  scheduledStartTime: z.string(),
  scheduledEndTime: z.string(),
  actualStartTime: z.string().optional(),
  actualEndTime: z.string().optional(),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']),
  route: z.array(walkingRoutePointSchema).optional(),
  distance: z.number().optional(),
  duration: z.number(),
  notes: z.string().optional(),
  rating: z.number().min(1).max(5).optional(),
  feedback: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string().nullable(),
  recurring: z.boolean().default(false),
  recurringPattern: z.object({
    frequency: z.enum(['daily', 'weekly', 'monthly']),
    dayOfWeek: z.array(z.number()).optional(),
    dayOfMonth: z.number().optional(),
    endDate: z.string().optional()
  }).optional()
});

export type WalkSession = z.infer<typeof walkSessionSchema>;

export const insertWalkSessionSchema = walkSessionSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  actualStartTime: true,
  actualEndTime: true,
  route: true,
  distance: true,
  rating: true,
  feedback: true
}).extend({
  status: z.enum(['scheduled', 'cancelled']).default('scheduled')
});

export type InsertWalkSession = z.infer<typeof insertWalkSessionSchema>;

export const updateWalkSessionSchema = walkSessionSchema.partial().omit({
  id: true,
  createdAt: true
});

export type UpdateWalkSession = z.infer<typeof updateWalkSessionSchema>;
