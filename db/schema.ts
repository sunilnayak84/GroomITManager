import { pgTable, text, integer, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Branch table for multi-location support
export const branches = pgTable("branches", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address").notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Users table for authentication
export const users = pgTable("users", {
  id: varchar("id", { length: 255 }).primaryKey(), // Firebase UID
  email: varchar("email", { length: 255 }).unique().notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull().default("staff"),
  branchId: integer("branch_id").references(() => branches.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Customers table
export const customers = pgTable("customers", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  firstName: varchar("first_name", { length: 255 }).notNull(),
  lastName: varchar("last_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  password: varchar("password", { length: 255 }),
  gender: varchar("gender", { length: 10 }).notNull(),
  address: text("address"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Pets table
export const pets = pgTable("pets", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  breed: varchar("breed", { length: 100 }).notNull(),
  dateOfBirth: varchar("date_of_birth", { length: 50 }),
  age: integer("age"),
  gender: varchar("gender", { length: 20 }),
  weight: varchar("weight", { length: 20 }),
  weightUnit: varchar("weight_unit", { length: 10 }).default("kg"),
  height: varchar("height", { length: 20 }),
  heightUnit: varchar("height_unit", { length: 10 }).default("cm"),
  image: text("image_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Appointments table
export const appointments = pgTable("appointments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  petId: integer("pet_id").notNull().references(() => pets.id),
  groomerId: integer("groomer_id").notNull().references(() => users.id),
  date: timestamp("date").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Zod schemas for type safety and validation
export const insertUserSchema = createInsertSchema(users, {
  id: z.string().min(1),
  email: z.string().email("Invalid email format"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  role: z.enum(["admin", "staff"]),
});

export const insertCustomerSchema = createInsertSchema(customers, {
  email: z.string().email("Invalid email format"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  gender: z.enum(["male", "female", "other"], {
    required_error: "Please select a gender",
  }),
});

export const insertPetSchema = createInsertSchema(pets, {
  type: z.enum(["dog", "cat", "other"]),
  name: z.string().min(1, "Name is required"),
  breed: z.string().min(1, "Breed is required"),
  dateOfBirth: z.string().optional(),
  age: z.number().optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  weight: z.string().optional(),
  weightUnit: z.enum(["kg", "lbs"]).default("kg"),
  height: z.string().optional(),
  heightUnit: z.enum(["cm", "inches"]).default("cm"),
  image: z.string().optional(),
  notes: z.string().optional(),
});

export const insertAppointmentSchema = createInsertSchema(appointments, {
  status: z.enum(["pending", "confirmed", "completed", "cancelled"]),
});

// Branch schema for validation
export const insertBranchSchema = createInsertSchema(branches, {
  name: z.string().min(2, "Branch name must be at least 2 characters"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
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

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = typeof appointments.$inferInsert;
