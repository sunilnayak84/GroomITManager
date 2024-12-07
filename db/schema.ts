import { pgTable, integer, varchar, timestamp, text, boolean, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Branches table
export const branches = pgTable("branches", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address").notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  openingTime: varchar("opening_time", { length: 5 }).notNull().default("09:00"),
  closingTime: varchar("closing_time", { length: 5 }).notNull().default("17:00"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Working days table
export const workingDays = pgTable("working_days", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  branchId: integer("branch_id").notNull().references(() => branches.id),
  dayOfWeek: integer("day_of_week").notNull(), // 0-6 for Sunday-Saturday
  isOpen: boolean("is_open").notNull().default(true),
  openingTime: varchar("opening_time", { length: 5 }), // Override branch default if needed
  closingTime: varchar("closing_time", { length: 5 }), // Override branch default if needed
  createdAt: timestamp("created_at").defaultNow(),
});

// Users table with groomer-specific fields
export const users = pgTable("users", {
  id: varchar("id", { length: 255 }).primaryKey(), // Firebase UID
  email: varchar("email", { length: 255 }).unique().notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull().default("staff"),
  branchId: integer("branch_id").references(() => branches.id),
  isGroomer: boolean("is_groomer").notNull().default(false),
  specialties: text("specialties").array(), // Array of service IDs they specialize in
  availability: text("availability"), // JSON string of weekly availability
  createdAt: timestamp("created_at").defaultNow(),
});

// Services table
export const services = pgTable("services", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").notNull(),
  duration: integer("duration").notNull(), // Duration in minutes
  price: integer("price").notNull(), // Price in cents
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Inventory items table
export const inventory = pgTable("inventory", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  sku: varchar("sku", { length: 50 }).unique(),
  currentStock: integer("current_stock").notNull().default(0),
  minimumStock: integer("minimum_stock").notNull().default(5),
  unit: varchar("unit", { length: 20 }).notNull(), // e.g., "bottle", "pack"
  unitSize: varchar("unit_size", { length: 20 }), // e.g., "500ml", "1kg"
  reorderPoint: integer("reorder_point").notNull().default(10),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

// Service-Inventory relationship (products used in services)
export const serviceProducts = pgTable("service_products", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  serviceId: integer("service_id").notNull().references(() => services.id),
  inventoryId: integer("inventory_id").notNull().references(() => inventory.id),
  quantityUsed: numeric("quantity_used").notNull(), // Amount of product used per service
  createdAt: timestamp("created_at").defaultNow(),
});

// Customers table
export const customers = pgTable("customers", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  firebaseId: varchar("firebase_id", { length: 255 }).unique(),
  firstName: varchar("first_name", { length: 255 }).notNull(),
  lastName: varchar("last_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  address: text("address"),
  gender: varchar("gender", { length: 20 }),
  petCount: integer("pet_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Pets table
export const pets = pgTable("pets", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  firebaseId: varchar("firebase_id", { length: 255 }).unique(),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  breed: varchar("breed", { length: 100 }).notNull(),
  dateOfBirth: varchar("date_of_birth", { length: 50 }),
  age: integer("age"),
  gender: varchar("gender", { length: 20 }),
  weight: varchar("weight", { length: 20 }),
  weightUnit: varchar("weight_unit", { length: 10 }).default("kg"),
  image: text("image_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Enhanced appointments table with service information
export const appointments = pgTable("appointments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  petId: integer("pet_id").notNull().references(() => pets.id),
  serviceId: integer("service_id").notNull().references(() => services.id),
  groomerId: integer("groomer_id").notNull().references(() => users.id),
  branchId: integer("branch_id").notNull().references(() => branches.id),
  date: timestamp("date").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  notes: text("notes"),
  productsUsed: text("products_used"), // JSON string of inventory items used
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

// Validation schemas
export const insertServiceSchema = createInsertSchema(services, {
  name: z.string().min(2, "Service name must be at least 2 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  duration: z.number().min(1, "Duration must be at least 1 minute"),
  price: z.number().min(0, "Price cannot be negative"),
});

export const insertInventorySchema = createInsertSchema(inventory, {
  name: z.string().min(2, "Product name must be at least 2 characters"),
  sku: z.string().min(3, "SKU must be at least 3 characters"),
  currentStock: z.number().min(0, "Stock cannot be negative"),
  unit: z.string().min(1, "Unit is required"),
});

export const insertWorkingDaysSchema = createInsertSchema(workingDays, {
  dayOfWeek: z.number().min(0).max(6),
  openingTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  closingTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
});

// Export types
export type Branch = typeof branches.$inferSelect;
export type InsertBranch = typeof branches.$inferInsert;

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;

export type Pet = typeof pets.$inferSelect;
export type InsertPet = typeof pets.$inferInsert;

export type Service = typeof services.$inferSelect;
export type InsertService = typeof services.$inferInsert;

export type Inventory = typeof inventory.$inferSelect;
export type InsertInventory = typeof inventory.$inferInsert;

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = typeof appointments.$inferInsert;

export type WorkingDays = typeof workingDays.$inferSelect;
export type InsertWorkingDays = typeof workingDays.$inferInsert;