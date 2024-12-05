import { pgTable, text, integer, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Users table for authentication
export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  username: varchar("username", { length: 255 }).unique().notNull(),
  password: text("password").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull().default("staff"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Customers table
export const customers = pgTable("customers", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
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
  size: varchar("size", { length: 20 }).notNull(),
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
  username: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  role: z.enum(["admin", "staff"]),
});

export const insertCustomerSchema = createInsertSchema(customers, {
  email: z.string().email("Invalid email format"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  name: z.string().min(2, "Name must be at least 2 characters"),
});

export const insertPetSchema = createInsertSchema(pets, {
  type: z.enum(["dog", "cat", "other"]),
  size: z.enum(["small", "medium", "large"]),
});

export const insertAppointmentSchema = createInsertSchema(appointments, {
  status: z.enum(["pending", "confirmed", "completed", "cancelled"]),
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;

export type Pet = typeof pets.$inferSelect;
export type InsertPet = typeof pets.$inferInsert;

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = typeof appointments.$inferInsert;
