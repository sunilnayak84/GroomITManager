import { z } from "zod";

// Define the consumable schema
export const serviceConsumableSchema = z.object({
  item_id: z.string().min(1, "Item ID is required"),
  item_name: z.string().min(1, "Item name is required"),
  quantity_used: z.number().positive("Quantity must be greater than 0"),
});

// Define the service schema
export const ServiceCategory = {
  SERVICE: 'Service',
  ADDON: 'Addon',
  PACKAGE: 'Package'
} as const;

export type PackageItem = {
  service_id: string;
  name: string;
  duration: number;
  price: number;
  category: typeof ServiceCategory[keyof typeof ServiceCategory];
};

export const serviceSchema = z.object({
  service_id: z.string(),
  name: z.string().min(2, "Service name must be at least 2 characters"),
  description: z.string().optional(),
  category: z.enum([ServiceCategory.SERVICE, ServiceCategory.ADDON, ServiceCategory.PACKAGE]).default(ServiceCategory.SERVICE),
  duration: z.number().min(15, "Duration must be at least 15 minutes"),
  price: z.number().min(0, "Price cannot be negative"),
  discount_percentage: z.number().min(0).max(100).optional().default(0),
  consumables: z.array(serviceConsumableSchema).default([]),
  isActive: z.boolean().default(true),
  created_at: z.string().or(z.date()).transform(val => 
    typeof val === 'string' ? new Date(val) : val
  ),
  updated_at: z.string().or(z.date()).transform(val => 
    typeof val === 'string' ? new Date(val) : val
  ),
  selectedServices: z.array(z.object({
    service_id: z.string(),
    name: z.string(),
    duration: z.number(),
    price: z.number(),
    category: z.enum([ServiceCategory.SERVICE, ServiceCategory.ADDON, ServiceCategory.PACKAGE])
  })).optional(),
  selectedAddons: z.array(z.object({
    service_id: z.string(),
    name: z.string(),
    duration: z.number(),
    price: z.number(),
    category: z.enum([ServiceCategory.SERVICE, ServiceCategory.ADDON, ServiceCategory.PACKAGE])
  })).optional()
});

// Export types based on the schema
export type ServiceConsumable = z.infer<typeof serviceConsumableSchema>;
export type Service = z.infer<typeof serviceSchema>;

// Schema for creating/updating a service
export const insertServiceSchema = serviceSchema.omit({
  service_id: true,
  created_at: true,
  updated_at: true,
}).extend({
  consumables: z.array(serviceConsumableSchema).optional().default([]),
  name: z.string().min(2, "Service name must be at least 2 characters"),
  price: z.number().min(0, "Price cannot be negative").default(0),
  duration: z.number().min(15, "Duration must be at least 15 minutes").default(30),
  selectedServices: z.array(z.object({
    service_id: z.string(),
    name: z.string(),
    duration: z.number(),
    price: z.number(),
    category: z.enum([ServiceCategory.SERVICE, ServiceCategory.ADDON, ServiceCategory.PACKAGE])
  })).optional(),
  selectedAddons: z.array(z.object({
    service_id: z.string(),
    name: z.string(),
    duration: z.number(),
    price: z.number(),
    category: z.enum([ServiceCategory.SERVICE, ServiceCategory.ADDON, ServiceCategory.PACKAGE])
  })).optional()
});

export type ServiceSelection = {
  service_id: string;
  name: string;
  duration: number;
  price: number;
  category: typeof ServiceCategory[keyof typeof ServiceCategory];
};

export type InsertService = {
  name: string;
  description?: string;
  category: typeof ServiceCategory[keyof typeof ServiceCategory];
  duration: number;
  price: number;
  discount_percentage?: number;
  consumables: ServiceConsumable[];
  isActive?: boolean;
  selectedServices?: ServiceSelection[];
  selectedAddons?: ServiceSelection[];
};

// Schema for updating a service
export const updateServiceSchema = insertServiceSchema.partial();
export type UpdateService = z.infer<typeof updateServiceSchema>;