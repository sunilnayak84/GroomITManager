import { z } from "zod";

// Service categories
export const ServiceCategory = {
  SERVICE: 'Service',
  ADDON: 'Addon',
  PACKAGE: 'Package',
  WALKING: 'Walking'
} as const;

// Base consumable schema for form validation and service operations
export const baseConsumableSchema = z.object({
  item_id: z.string().min(1, "Item ID is required"),
  item_name: z.string().min(1, "Item name is required")
});

// Service consumable schema
export const serviceConsumableSchema = baseConsumableSchema;

// Package item type
export type PackageItem = {
  service_id: string;
  name: string;
  duration: number;
  price: number;
  category: typeof ServiceCategory[keyof typeof ServiceCategory];
};

// Enhanced walking service schema with route tracking
export const walkingServiceSchema = z.object({
  duration: z.number().min(1, "Walk must be at least 1 minute"),
  distance: z.number().optional(),
  route: z.array(z.object({
    lat: z.number(),
    lng: z.number(),
    timestamp: z.date()
  })).optional(),
  startLocation: z.object({
    lat: z.number(),
    lng: z.number(),
    address: z.string()
  }).optional(),
  endLocation: z.object({
    lat: z.number(),
    lng: z.number(),
    address: z.string()
  }).optional(),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']).default('scheduled'),
  walkerId: z.string().optional(),
  petId: z.string(),
  customerId: z.string(),
  scheduledTime: z.string(),
  actualStartTime: z.string().optional(),
  actualEndTime: z.string().optional(),
  notes: z.string().optional(),
  recurring: z.boolean().default(false),
  recurringPattern: z.object({
    frequency: z.enum(['daily', 'weekly', 'monthly']),
    dayOfWeek: z.array(z.number()).optional(), // 0-6 for weekly
    dayOfMonth: z.number().optional(), // 1-31 for monthly
    endDate: z.string().optional()
  }).optional()
});

// Base service schema with essential fields
export const baseServiceSchema = {
  name: z.string().min(2, "Service name must be at least 2 characters"),
  category: z.enum([ServiceCategory.SERVICE, ServiceCategory.ADDON, ServiceCategory.PACKAGE, ServiceCategory.WALKING]),
  duration: z.number().min(1, "Duration must be at least 1 minute"),
  price: z.number().min(0, "Price cannot be negative"),
  description: z.string().nullable().default(null),
};

// Full service schema for database operations
export const serviceSchema = z.object({
  service_id: z.string(),
  ...baseServiceSchema,
  discount_percentage: z.number().min(0).max(100).optional().default(0),
  required_categories: z.array(z.string()).optional().default([]),
  consumables: z.array(serviceConsumableSchema).optional().default([]),
  isActive: z.boolean().default(true),
  created_at: z.date().or(z.string()).transform(val => 
    typeof val === 'string' ? new Date(val) : val
  ),
  updated_at: z.date().or(z.string()).transform(val => 
    typeof val === 'string' ? new Date(val) : val
  ),
  selectedServices: z.array(z.object({
    service_id: z.string(),
    name: z.string(),
    duration: z.number(),
    price: z.number(),
    category: z.enum([ServiceCategory.SERVICE, ServiceCategory.ADDON, ServiceCategory.PACKAGE, ServiceCategory.WALKING])
  })).optional(),
  selectedAddons: z.array(z.object({
    service_id: z.string(),
    name: z.string(),
    duration: z.number(),
    price: z.number(),
    category: z.enum([ServiceCategory.SERVICE, ServiceCategory.ADDON, ServiceCategory.PACKAGE, ServiceCategory.WALKING])
  })).optional(),
  walkingDetails: walkingServiceSchema.optional()
});

// Schema for creating a new service
export const insertServiceSchema = z.object({
  ...baseServiceSchema,
  discount_percentage: z.number().min(0).max(100).optional().default(0),
  consumables: z.array(serviceConsumableSchema).optional().default([]),
  isActive: z.boolean().default(true),
  selectedServices: z.array(z.object({
    service_id: z.string(),
    name: z.string(),
    duration: z.number(),
    price: z.number(),
    category: z.enum([ServiceCategory.SERVICE, ServiceCategory.ADDON, ServiceCategory.PACKAGE, ServiceCategory.WALKING])
  })).optional(),
  selectedAddons: z.array(z.object({
    service_id: z.string(),
    name: z.string(),
    duration: z.number(),
    price: z.number(),
    category: z.enum([ServiceCategory.SERVICE, ServiceCategory.ADDON, ServiceCategory.PACKAGE, ServiceCategory.WALKING])
  })).optional(),
  walkingDetails: walkingServiceSchema.optional()
});

// Export types
export type ServiceConsumable = z.infer<typeof serviceConsumableSchema>;
export type Service = z.infer<typeof serviceSchema>;
export type InsertService = z.infer<typeof insertServiceSchema>;
export type UpdateService = Partial<InsertService>;
export type WalkingService = z.infer<typeof walkingServiceSchema>;
export type WalkingServiceStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

// Update service schema
export const updateServiceSchema = insertServiceSchema.partial();

// Walking specific schemas
export const walkingRoutePointSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  timestamp: z.date()
});

export type WalkingRoutePoint = z.infer<typeof walkingRoutePointSchema>;