import { pgTable, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  role: text("role").notNull().default("groomer"),
  name: text("name").notNull(),
});

export const customers = pgTable("customers", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  address: text("address"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const pets = pgTable("pets", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  customerId: integer("customer_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  breed: text("breed").notNull(),
  size: text("size").notNull(),
  notes: text("notes"),
  image: text("image"),
});

export const appointments = pgTable("appointments", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  petId: integer("pet_id").notNull(),
  groomerId: integer("groomer_id").notNull(),
  date: timestamp("date").notNull(),
  status: text("status").notNull().default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Zod schemas
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = z.infer<typeof selectUserSchema>;

export const insertCustomerSchema = createInsertSchema(customers);
export const selectCustomerSchema = createSelectSchema(customers);
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = z.infer<typeof selectCustomerSchema>;

export const insertPetSchema = createInsertSchema(pets);
export const selectPetSchema = createSelectSchema(pets);
export type InsertPet = z.infer<typeof insertPetSchema>;
export type Pet = z.infer<typeof selectPetSchema>;

export const insertAppointmentSchema = createInsertSchema(appointments);
export const selectAppointmentSchema = createSelectSchema(appointments);
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = z.infer<typeof selectAppointmentSchema>;
