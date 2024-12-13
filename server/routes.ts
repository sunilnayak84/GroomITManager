import { type Express } from "express";
import { setupAuth, setUserRole } from "./auth";
import { db } from "../db";
import { appointments, customers, pets, users } from "@db/schema";
import { and, eq, gte, count, sql } from "drizzle-orm";
import admin from "firebase-admin";
import { authenticateFirebase, requireRole } from './middleware/auth';

export function registerRoutes(app: Express) {
  // Setup protected routes with Firebase authentication
  const protectedRoutes = ['/api/appointments', '/api/customers', '/api/pets', '/api/stats'];
  app.use(protectedRoutes, authenticateFirebase);

  // Public routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Get current user profile
  app.get("/api/me", authenticateFirebase, (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json(req.user);
  });

  // User role management
  // Admin setup endpoint - works in both development and production
  app.post("/api/setup-admin", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email || email !== 'admin@groomery.in') {
        return res.status(400).json({ 
          message: "Invalid email",
          error: "Only admin@groomery.in is allowed for admin setup"
        });
      }

      if (process.env.NODE_ENV === 'development') {
        // In development, create a mock admin user
        console.log('Setting up admin in development mode');
        await setUserRole('dev-admin-uid', 'admin');
        
        return res.json({ 
          message: "Admin role set successfully (development mode)",
          userId: 'dev-admin-uid',
          email: email,
          role: 'admin',
          permissions: ['all']
        });
      }

      try {
        // In production, get or create the user
        let userRecord;
        try {
          userRecord = await admin.auth().getUserByEmail(email);
        } catch (error) {
          // If user doesn't exist, create them
          userRecord = await admin.auth().createUser({
            email: email,
            emailVerified: true,
            displayName: 'Admin User'
          });
        }

        // Set admin role
        await setUserRole(userRecord.uid, 'admin');
        
        res.json({ 
          message: "Admin role set successfully",
          userId: userRecord.uid,
          email: userRecord.email,
          role: 'admin',
          permissions: ['all']
        });
      } catch (firebaseError) {
        console.error('Firebase operation failed:', firebaseError);
        throw new Error('Failed to setup admin user in Firebase');
      }
    } catch (error) {
      console.error('Error setting up admin:', error);
      res.status(500).json({ 
        message: "Failed to set up admin role",
        error: error instanceof Error ? error.message : "Unknown error",
        env: process.env.NODE_ENV
      });
    }
  });

  app.post("/api/users/:userId/role", authenticateFirebase, requireRole(['admin']), async (req, res) => {
    try {
      const { userId } = req.params;
      const { role, email } = req.body;

      if (!userId || !role || !['admin', 'staff', 'receptionist'].includes(role)) {
        return res.status(400).json({ 
          error: "Invalid user ID or role",
          message: "Role must be one of: admin, staff, receptionist"
        });
      }

      // Additional validation for admin role changes
      if (role === 'admin') {
        // Only allow specific admin emails or in development
        const allowedAdminEmails = ['admin@groomery.in'];
        if (!email || (!allowedAdminEmails.includes(email) && process.env.NODE_ENV !== 'development')) {
          return res.status(403).json({
            error: "Unauthorized admin assignment",
            message: "This email is not authorized for admin role"
          });
        }
      }

      try {
        await setUserRole(userId, role);
        console.log(`Role successfully updated - User ID: ${userId}, New Role: ${role}, Email: ${email}`);
        
        res.json({ 
          success: true,
          message: `User role updated to ${role}`,
          userId,
          role,
          email 
        });
      } catch (error) {
        console.error('Failed to set user role:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      res.status(500).json({ 
        error: "Failed to update user role",
        message: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  });

  // Dashboard stats - restricted to admin and staff
  app.get("/api/stats", authenticateFirebase, requireRole(['admin', 'staff']), async (req, res) => {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

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
  app.get("/api/appointments/stats", authenticateFirebase, async (req, res) => {
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
  app.get("/api/pets", authenticateFirebase, requireRole(['admin', 'staff', 'receptionist']), async (req, res) => {
    try {
      const allPets = await db.select().from(pets);
      res.json(allPets);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch pets" });
    }
  });

  app.post("/api/pets", authenticateFirebase, requireRole(['admin', 'staff']), async (req, res) => {
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
  app.get("/api/appointments", authenticateFirebase, async (req, res) => {
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

  app.post("/api/appointments", authenticateFirebase, requireRole(['admin', 'staff', 'receptionist']), async (req, res) => {
    try {
      const [newAppointment] = await db.insert(appointments).values(req.body).returning();
      res.json(newAppointment);
    } catch (error) {
      res.status(500).json({ error: "Failed to create appointment" });
    }
  });
}

