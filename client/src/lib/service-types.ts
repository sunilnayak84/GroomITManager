import { z } from "zod";

// Base consumable schema without timestamps
export const baseConsumableSchema = z.object({
  item_id: z.string().min(1, "Item ID is required"),
  item_name: z.string().min(1, "Item name is required"),
  quantity_used: z.number().positive("Quantity must be greater than 0")
});

// Full consumable schema with timestamps
export const serviceConsumableSchema = baseConsumableSchema.extend({
  created_at: z.date().default(() => new Date()),
  updated_at: z.date().default(() => new Date())
}).transform(data => ({
  ...data,
  quantity_used: Number(data.quantity_used)
}));

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

// Base service schema for required fields
const baseServiceSchema = {
  name: z.string().min(2, "Service name must be at least 2 characters"),
  category: z.enum([ServiceCategory.SERVICE, ServiceCategory.ADDON, ServiceCategory.PACKAGE]),
  duration: z.number().min(15, "Duration must be at least 15 minutes"),
  price: z.number().min(0, "Price cannot be negative"),
};

// Full service schema including all fields
export const serviceSchema = z.object({
  service_id: z.string(),
  ...baseServiceSchema,
  description: z.string().nullable().default(null),
  discount_percentage: z.number().min(0).max(100).optional().transform(val => {
    if (val === undefined) return 0;
    return val > 1 ? val / 100 : val;
  }),
  consumables: z.array(serviceConsumableSchema).optional().default([]),
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
export const insertServiceSchema = z.object({
  ...baseServiceSchema,
  description: z.string().nullable().default(null),
  discount_percentage: z.number().min(0).max(100).optional().transform(val => val ?? 0),
  consumables: z.array(
    z.object({
      item_id: z.string().min(1, "Item ID is required"),
      item_name: z.string().min(1, "Item name is required"),
      quantity_used: z.number().positive("Quantity must be greater than 0"),
      created_at: z.date().optional().default(() => new Date()),
      updated_at: z.date().optional().default(() => new Date())
    })
  )
  .optional()
  .default([])
  .transform(data => 
    data.map(consumable => ({
      item_id: consumable.item_id,
      item_name: consumable.item_name,
      quantity_used: Number(consumable.quantity_used),
      created_at: consumable.created_at || new Date(),
      updated_at: consumable.updated_at || new Date()
    }))
  ),
  isActive: z.boolean().default(true),
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