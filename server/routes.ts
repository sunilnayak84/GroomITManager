import { type Express } from "express";
import { setupAuth } from "./auth";
import { db } from "../db";
import { appointments, customers, pets, users } from "@db/schema";
import { crypto } from "./auth";
import { and, eq, gte, count } from "drizzle-orm";

async function createAdminUser(app: Express) {
  try {
    // Check if admin user already exists
    const [existingAdmin] = await db
      .select()
      .from(users)
      .where(eq(users.username, 'admin@groomery.in'))
      .limit(1);

    if (!existingAdmin) {
      const hashedPassword = await crypto.hash('admin123');
      const [adminUser] = await db.insert(users).values({
        username: 'admin@groomery.in',
        password: hashedPassword,
        role: 'admin',
        name: 'Admin User'
      }).returning();
      console.log('Admin user created successfully:', adminUser.id);
    } else {
      console.log('Admin user already exists:', existingAdmin.id);
    }
  } catch (error) {
    console.error('Error creating admin user:', error);
    throw error; // Rethrow to handle it in the caller
  }
}

import { authenticateFirebase } from './middleware/auth';

export function registerRoutes(app: Express) {
  // Setup protected routes with Firebase authentication
  const protectedRoutes = ['/api/appointments', '/api/customers', '/api/pets', '/api/stats'];
  app.use(protectedRoutes, authenticateFirebase);

  // Create routes without auth middleware
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Dashboard stats
  app.get("/api/stats", async (req, res) => {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [appointmentCount] = await db
        .select({ count: count() })
        .from(appointments)
        .where(gte(appointments.date, startOfMonth));

      const [customerCount] = await db
        .select({ count: count() })
        .from(customers);

      const [completedCount] = await db
        .select({ count: count() })
        .from(appointments)
        .where(and(
          eq(appointments.status, "completed"),
          gte(appointments.date, startOfMonth)
        ));

      res.json({
        appointments: appointmentCount?.count || 0,
        customers: customerCount?.count || 0,
        completed: completedCount?.count || 0,
        revenue: (completedCount?.count || 0) * 1000 // dummy calculation
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Appointments stats for chart
  app.get("/api/appointments/stats", async (req, res) => {
    try {
      const now = new Date();
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const data = days.map(name => ({ name, total: Math.floor(Math.random() * 10) }));
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch appointment stats" });
    }
  });

  // Pets routes
  app.get("/api/pets", async (req, res) => {
    try {
      const allPets = await db.select().from(pets);
      res.json(allPets);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch pets" });
    }
  });

  app.post("/api/pets", async (req, res) => {
    try {
      const [newPet] = await db.insert(pets).values(req.body).returning();
      res.json(newPet);
    } catch (error) {
      res.status(500).json({ error: "Failed to create pet" });
    }
  });

  // Customers routes
  app.get("/api/customers", async (req, res) => {
    try {
      const allCustomers = await db.select().from(customers);
      res.json(allCustomers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });

  app.post("/api/customers", async (req, res) => {
    try {
      const [newCustomer] = await db.insert(customers).values(req.body).returning();
      res.json(newCustomer);
    } catch (error) {
      res.status(500).json({ error: "Failed to create customer" });
    }
  });

  // Appointments routes
  app.get("/api/appointments", async (req, res) => {
    try {
      const allAppointments = await db
        .select({
          id: appointments.id,
          date: appointments.date,
          status: appointments.status,
          notes: appointments.notes,
          pet: pets,
          customer: customers,
          groomer: users,
        })
        .from(appointments)
        .leftJoin(pets, eq(appointments.petId, pets.id))
        .leftJoin(customers, eq(pets.customerId, customers.id))
        .leftJoin(users, eq(appointments.groomerId, users.id));
      res.json(allAppointments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch appointments" });
    }
  });

  app.post("/api/appointments", async (req, res) => {
    try {
      const [newAppointment] = await db.insert(appointments).values(req.body).returning();
      res.json(newAppointment);
    } catch (error) {
      res.status(500).json({ error: "Failed to create appointment" });
    }
  });
}
