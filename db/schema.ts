import { pgTable, integer, varchar, text, timestamp, boolean, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Role and Permission Types
export type RoleType = 'admin' | 'manager' | 'staff' | 'receptionist';

export type Permission = 
  | 'manage_appointments' | 'view_appointments' | 'create_appointments' | 'cancel_appointments'
  | 'manage_customers' | 'view_customers' | 'create_customers' | 'edit_customer_info'
  | 'manage_services' | 'view_services' | 'create_services' | 'edit_services'
  | 'manage_inventory' | 'view_inventory' | 'update_stock' | 'manage_consumables'
  | 'manage_staff_schedule' | 'view_staff_schedule' | 'manage_own_schedule'
  | 'view_analytics' | 'view_reports' | 'view_financial_reports' | 'all';

// Roles table definition
export const roles = pgTable("roles", {
  id: varchar("id", { length: 50 }).primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  permissions: text("permissions").array().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at")
});
// States for Indian addresses
export const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
] as const;

// Service categories specific to Indian market
export const SERVICE_CATEGORIES = {
  PREMIUM: "Premium",    // Premium grooming with luxury spa treatments and specialty products
  STANDARD: "Standard",  // Regular grooming services with standard Indian products
  BASIC: "Basic",       // Essential grooming needs at affordable price point
} as const;

// Branches table with enhanced Indian address format
export const branches = pgTable("branches", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  nameHindi: varchar("name_hindi", { length: 255 }), // Hindi name
  address: text("address").notNull(),
  landmark: varchar("landmark", { length: 255 }), // Nearby landmark for easy location
  area: varchar("area", { length: 100 }).notNull(), // Area/Locality
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 100 }).notNull(),
  pincode: varchar("pincode", { length: 6 }).notNull(),
  phone: varchar("phone", { length: 15 }).notNull(),
  alternatePhone: varchar("alternate_phone", { length: 15 }), // Alternative contact
  gstin: varchar("gstin", { length: 15 }), // GST registration number
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Working days table with enhanced scheduling
export const workingDays = pgTable("working_days", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  branchId: integer("branch_id").notNull().references(() => branches.id),
  dayOfWeek: integer("day_of_week").notNull(), // 0-6 for Sunday-Saturday
  isOpen: boolean("is_open").notNull().default(true),
  openingTime: varchar("opening_time", { length: 5 }).notNull(), // 24hr format HH:mm
  closingTime: varchar("closing_time", { length: 5 }).notNull(), // 24hr format HH:mm
  breakStart: varchar("break_start", { length: 5 }), // Optional break time
  breakEnd: varchar("break_end", { length: 5 }), // Optional break time
  maxDailyAppointments: integer("max_daily_appointments"), // Optional limit
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

// Staff/Users table with enhanced groomer fields
export const users = pgTable("users", {
  id: varchar("id", { length: 255 }).primaryKey(), // Firebase UID
  email: varchar("email", { length: 255 }).unique().notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 15 }).notNull(),
  roleId: varchar("role_id", { length: 50 }).references(() => roles.id).notNull(),
  branchId: integer("branch_id").references(() => branches.id),
  isGroomer: boolean("is_groomer").notNull().default(false),
  specialties: text("specialties").array(), // Array of service IDs they specialize in
  petTypePreferences: text("pet_type_preferences").array(), // Types of pets they work with
  experienceYears: integer("experience_years"),
  certifications: text("certifications").array(),
  availability: text("availability"), // JSON string of weekly availability
  maxDailyAppointments: integer("max_daily_appointments"), // Maximum appointments per day
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

// Services table with India-specific categories and multilingual support
export const services = pgTable("services", {
  id: varchar("id", { length: 255 }).primaryKey(), // Changed to varchar for service_id
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  duration: integer("duration").notNull(), // Duration in minutes
  price: integer("price").notNull(), // Price in INR
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

// Service consumables relation table
export const serviceConsumables = pgTable("service_consumables", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  serviceId: varchar("service_id", { length: 255 }).notNull().references(() => services.id),
  itemId: varchar("item_id", { length: 255 }).notNull(), // References inventory item
  itemName: varchar("item_name", { length: 255 }).notNull(),
  quantityUsed: decimal("quantity_used").notNull(), // Decimal for precise measurements
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

// Inventory items table with Indian market context
export const inventory = pgTable("inventory", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }).notNull(),
  currentStock: integer("current_stock").notNull(),
  minimumStock: integer("minimum_stock").notNull(),
  unit: varchar("unit", { length: 20 }).notNull(), // ml, g, pieces etc.
  pricePerUnitINR: integer("price_per_unit_inr").notNull(), // Cost per unit in INR
  supplier: varchar("supplier", { length: 255 }),
  gstRate: integer("gst_rate"), // GST rate percentage
  branchId: integer("branch_id").references(() => branches.id),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
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
  customerId: integer("customer_id").notNull().references(() => customers.id),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  breed: varchar("breed", { length: 100 }).notNull(),
  size: varchar("size", { length: 50 }).notNull(),
  imageUrl: text("image_url").notNull().default(''),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Enhanced appointments table with service information
export const appointments = pgTable("appointments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  petId: integer("pet_id").notNull().references(() => pets.id),
  groomerId: integer("groomer_id").notNull(),
  serviceType: varchar("service_type", { length: 100 }).notNull(),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  appointmentDate: timestamp("appointment_date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  price: integer("price").notNull(),
});

// Service-Inventory relationship (products used in services)
export const serviceProducts = pgTable("service_products", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  serviceId: integer("service_id").notNull().references(() => services.id),
  inventoryId: integer("inventory_id").notNull().references(() => inventory.id),
  quantityUsed: integer("quantity_used").notNull(), // Amount of product used per service
  createdAt: timestamp("created_at").defaultNow(),
});

// Schema Validations
export const insertBranchSchema = createInsertSchema(branches, {
  name: z.string().min(2, "Branch name must be at least 2 characters"),
  nameHindi: z.string().optional(),
  address: z.string().min(10, "Address must be at least 10 characters"),
  landmark: z.string().optional(),
  area: z.string().min(2, "Area/Locality is required"),
  city: z.string().min(2, "City is required"),
  state: z.enum(INDIAN_STATES, {
    required_error: "Please select a valid Indian state",
  }),
  pincode: z.string().regex(/^[1-9][0-9]{5}$/, "Invalid pincode format"),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Invalid Indian mobile number"),
  alternatePhone: z.string().regex(/^[6-9]\d{9}$/, "Invalid Indian mobile number").optional(),
  gstin: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid GSTIN format").optional(),
});

export const insertWorkingDaysSchema = createInsertSchema(workingDays, {
  dayOfWeek: z.number().min(0).max(6),
  openingTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  closingTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  breakStart: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  breakEnd: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  maxDailyAppointments: z.number().min(1).optional(),
});

export const insertServiceSchema = createInsertSchema(services, {
  name: z.string().min(2, "Service name must be at least 2 characters"),
  description: z.string().optional(),
  duration: z.number().min(15, "Duration must be at least 15 minutes"),
  price: z.number().min(0, "Price cannot be negative"),
  isActive: z.boolean().default(true),
});

export const insertServiceConsumableSchema = createInsertSchema(serviceConsumables, {
  itemId: z.string().min(1, "Item ID is required"),
  itemName: z.string().min(1, "Item name is required"),
  quantityUsed: z.number().positive("Quantity must be greater than 0"),
});

export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email("Invalid email format"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Invalid Indian mobile number"),
  role: z.enum(["admin", "groomer", "staff"]),
  specialties: z.array(z.string()).optional(),
  petTypePreferences: z.array(z.string()).optional(),
  experienceYears: z.number().min(0).optional(),
  certifications: z.array(z.string()).optional(),
  availability: z.string().optional(),
  maxDailyAppointments: z.number().min(1).optional(),
});

export const insertInventorySchema = createInsertSchema(inventory, {
  name: z.string().min(2, "Product name must be at least 2 characters"),
  category: z.string().min(1, "Category is required"),
  currentStock: z.number().min(0, "Stock cannot be negative"),
  minimumStock: z.number().min(0, "Minimum stock cannot be negative"),
  unit: z.string().min(1, "Unit is required"),
  pricePerUnitINR: z.number().min(0, "Price cannot be negative"),
  supplier: z.string().optional(),
  gstRate: z.number().min(0).max(28).optional(), // Standard GST rates in India
  branchId: z.number().min(1, "Branch must be selected").optional(),
});

export const insertPetSchema = createInsertSchema(pets, {
  name: z.string().min(1, "Pet name is required"),
  type: z.string().min(1, "Pet type is required"),
  breed: z.string().min(1, "Pet breed is required"),
  customerId: z.number().min(1, "Customer must be selected"),
  size: z.string().min(1, "Pet size is required"),
  imageUrl: z.string().default(''),
  notes: z.string().nullable(),
});

export const insertCustomerSchema = createInsertSchema(customers, {
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Invalid email format"),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Invalid Indian mobile number"),
  address: z.string().optional(),
  gender: z.string().optional(),
});

export const insertAppointmentSchema = createInsertSchema(appointments, {
  petId: z.number().min(1, "Pet must be selected"),
  groomerId: z.number().min(1, "Groomer must be selected"),
  serviceType: z.string().min(1, "Service type must be selected"),
  status: z.enum(["pending", "confirmed", "completed", "cancelled"]).default("pending"),
  appointmentDate: z.date().min(new Date(), "Appointment date must be in the future"),
  price: z.number().min(0, "Price must be non-negative"),
  notes: z.string().optional()
});

// Export types
export type Branch = typeof branches.$inferSelect;
export type InsertBranch = typeof branches.$inferInsert;

export type WorkingDays = typeof workingDays.$inferSelect;
export type InsertWorkingDays = typeof workingDays.$inferInsert;

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export type Service = typeof services.$inferSelect;
export type InsertService = typeof services.$inferInsert;

export type Inventory = typeof inventory.$inferSelect;
export type InsertInventory = typeof inventory.$inferInsert;

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;

export type Pet = typeof pets.$inferSelect;
export type InsertPet = typeof pets.$inferInsert;

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = typeof appointments.$inferInsert;

export type ServiceProduct = typeof serviceProducts.$inferSelect;
export type InsertServiceProduct = typeof serviceProducts.$inferInsert;


// Notifications table
export const notifications = pgTable("notifications", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  appointmentId: integer("appointment_id").references(() => appointments.id),
  type: varchar("type", { length: 50 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

export const insertNotificationSchema = createInsertSchema(notifications, {
  title: z.string().min(1, "Title is required"),
  message: z.string().min(1, "Message is required"),
  type: z.enum(["reminder", "status_change", "cancellation", "reschedule"]),
});