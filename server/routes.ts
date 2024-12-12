import { type Express } from "express";
import { setupAuth } from "./auth";
import { db } from "../db";
import { appointments, customers, pets, users } from "@db/schema";
// Remove unused import
import { and, eq, gte, count, sql } from "drizzle-orm";

// Firebase handles user creation and management

import { authenticateFirebase, requireRole } from './middleware/auth';

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

      // Use more robust error handling and default to 0 for counts
      const appointmentResult = await db
        .select({ value: count() })
        .from(appointments)
        .where(gte(appointments.appointmentDate, startOfMonth));
      const appointmentCount = appointmentResult[0]?.value ?? 0;

      const customerResult = await db
        .select({ value: count() })
        .from(customers);
      const customerCount = customerResult[0]?.value ?? 0;

      const completedResult = await db
        .select({ value: count() })
        .from(appointments)
        .where(and(
          eq(appointments.status, "completed"),
          gte(appointments.appointmentDate, startOfMonth)
        ));
      const completedCount = completedResult[0]?.value ?? 0;

      res.json({
        appointments: appointmentCount,
        customers: customerCount,
        completed: completedCount,
        revenue: completedCount * 1000 // dummy calculation
      });
    } catch (error) {
      console.error('Stats Error:', error);
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
  app.get("/api/customers", authenticateFirebase, requireRole(['admin', 'staff']), async (req, res) => {
    try {
      const allCustomers = await db.select().from(customers);
      res.json(allCustomers);
    } catch (error) {
      console.error('Error fetching customers:', error);
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });

  app.post("/api/customers", authenticateFirebase, requireRole(['admin', 'staff']), async (req, res) => {
    try {
      const [newCustomer] = await db.insert(customers).values(req.body).returning();
      res.json(newCustomer);
    } catch (error) {
      console.error('Error creating customer:', error);
      res.status(500).json({ error: "Failed to create customer" });
    }
  });

  // Appointments routes
  app.get("/api/appointments", async (req, res) => {
    try {
      const allAppointments = await db
        .select({
          id: appointments.id,
          date: appointments.appointmentDate,
          status: appointments.status,
          notes: appointments.notes,
          serviceType: appointments.serviceType,
          price: appointments.price,
          pet: {
            id: pets.id,
            name: pets.name,
            breed: pets.breed,
            imageUrl: pets.imageUrl
          },
          customer: {
            id: customers.id,
            name: sql`${customers.firstName} || ' ' || ${customers.lastName}`
          },
          groomer: {
            id: users.id,
            name: users.name
          }
        })
        .from(appointments)
        .leftJoin(pets, eq(appointments.petId, pets.id))
        .leftJoin(customers, eq(pets.customerId, customers.id))
        .leftJoin(users, eq(appointments.groomerId, users.id));
      res.json(allAppointments);
    } catch (error) {
      console.error('Error fetching appointments:', error);
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
  // Working Hours routes
  app.get("/api/working-hours", authenticateFirebase, requireRole(['admin', 'staff']), async (req, res) => {
    try {
      const allWorkingHours = await db.select().from(workingDays);
      
      // If no working hours exist, create default schedules for all days
      if (allWorkingHours.length === 0) {
        const defaultSchedules = Array.from({ length: 7 }, (_, i) => ({
          branchId: 1,
          dayOfWeek: i,
          isOpen: i !== 0, // Closed on Sunday (day 0)
          openingTime: "09:00",
          closingTime: "17:00",
          breakStart: "13:00",
          breakEnd: "14:00",
          maxDailyAppointments: 8
        }));

        await db.insert(workingDays).values(defaultSchedules);
        const insertedHours = await db.select().from(workingDays);
        return res.json(insertedHours);
      }

      res.json(allWorkingHours);
    } catch (error) {
      console.error('Error fetching working hours:', error);
      res.status(500).json({ error: "Failed to fetch working hours" });
    }
  });

  app.put("/api/working-hours/:dayOfWeek", authenticateFirebase, requireRole(['admin']), async (req, res) => {
    try {
      const dayOfWeek = parseInt(req.params.dayOfWeek);
      const updateData = req.body;

      const [updated] = await db
        .update(workingDays)
        .set(updateData)
        .where(eq(workingDays.dayOfWeek, dayOfWeek))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: "Working hours not found for this day" });
      }

      res.json(updated);
    } catch (error) {
      console.error('Error updating working hours:', error);
      res.status(500).json({ error: "Failed to update working hours" });
    }
  });
}
