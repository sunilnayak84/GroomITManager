import { type Express } from "express";
import { db } from "../db";
import { appointments, customers, pets, users } from "@db/schema";
import { and, count, eq, gte } from "drizzle-orm";
import admin from "firebase-admin";
import { sql } from "drizzle-orm";
import { authenticateFirebase, requireRole, validateManagerOperation } from "./middleware/auth";
import { RolePermissions } from './auth';

export function registerRoutes(app: Express) {
  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "healthy" });
  });

  // Role Management endpoints - Admin only
  app.get("/api/roles", authenticateFirebase, requireRole(['admin']), async (req, res) => {
    try {
      // Return all roles and their permissions
      const roles = Object.entries(RolePermissions).map(([role, permissions]) => ({
        name: role,
        permissions: permissions
      }));
      res.json(roles);
    } catch (error) {
      console.error('Error fetching roles:', error);
      res.status(500).json({ error: "Failed to fetch roles" });
    }
  });

  // Firebase User Management endpoints - Admin only
  app.get("/api/firebase-users", authenticateFirebase, requireRole(['admin']), async (req, res) => {
    try {
      const { pageSize = 100, pageToken } = req.query;
      
      // List users from Firebase
      const listUsersResult = await admin.auth().listUsers(Number(pageSize), pageToken as string);
      
      // Get custom claims for role information
      const users = await Promise.all(
        listUsersResult.users.map(async (user) => {
          const customClaims = (await admin.auth().getUser(user.uid)).customClaims || {};
          return {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            role: customClaims.role || 'staff',
            permissions: customClaims.permissions || []
          };
        })
      );

      res.json({
        users,
        pageToken: listUsersResult.pageToken
      });
    } catch (error) {
      console.error('Error fetching Firebase users:', error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.post("/api/firebase-users/:userId/role", authenticateFirebase, requireRole(['admin']), async (req, res) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      if (!role || !['admin', 'manager', 'staff', 'receptionist'].includes(role)) {
        return res.status(400).json({ error: "Invalid role specified" });
      }

      // Get permissions for the role from our auth configuration
      const permissions = RolePermissions[role] || [];

      // Set custom claims in Firebase
      await admin.auth().setCustomUserClaims(userId, {
        role,
        permissions,
        updatedAt: new Date().toISOString()
      });

      res.json({ 
        message: "Role updated successfully",
        role,
        permissions
      });
    } catch (error) {
      console.error('Error updating user role:', error);
      res.status(500).json({ error: "Failed to update user role" });
    }
  });

  // Setup protected routes with Firebase authentication
  const protectedRoutes = ['/api/appointments', '/api/customers', '/api/pets', '/api/stats'];
  app.use(protectedRoutes, authenticateFirebase);

  // Public routes

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

      // Get user by email first
      let userRecord;
      try {
        userRecord = await admin.auth().getUserByEmail(email);
      } catch (error) {
        console.error('Error getting user by email:', error);
        return res.status(404).json({
          message: "User not found",
          error: "Please ensure you have signed up first"
        });
      }

      // Set admin role
      await setUserRole(userRecord.uid, 'admin');
      
      // Force token refresh
      await admin.auth().revokeRefreshTokens(userRecord.uid);
      
      console.log(`[ADMIN-SETUP] Admin role set for ${email} (${userRecord.uid})`);
      
      return res.json({ 
        message: "Admin role set successfully. You must sign out and sign back in for changes to take effect.",
        userId: userRecord.uid,
        email: email,
        role: 'admin',
        requiresRelogin: true
      });

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
          message: "Admin role set successfully. Please log out and log back in to access admin features.",
          userId: userRecord.uid,
          email: userRecord.email,
          role: 'admin',
          permissions: ['all'],
          requiresRelogin: true
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

  // Only admin can manage user roles - managers are explicitly blocked from this endpoint
  app.post("/api/users/:userId/role", authenticateFirebase, requireRole(['admin']), async (req, res) => {
    try {
      const { userId } = req.params;
      const { role, email } = req.body;

      if (!userId || !role || !['admin', 'manager', 'staff', 'receptionist'].includes(role)) {
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

  // Role management endpoints - Admin only
  app.get("/api/roles", authenticateFirebase, requireRole(['admin']), async (req, res) => {
    try {
      // Return all roles and their permissions
      const roles = Object.entries(RolePermissions).map(([role, permissions]) => ({
        name: role,
        permissions: permissions
      }));
      res.json(roles);
    } catch (error) {
      console.error('Error fetching roles:', error);
      res.status(500).json({ error: "Failed to fetch roles" });
    }
  });

  app.post("/api/roles", authenticateFirebase, requireRole(['admin']), async (req, res) => {
    try {
      const { name, permissions } = req.body;
      
      if (!name || !permissions) {
        return res.status(400).json({ error: "Name and permissions are required" });
      }

      // Prevent modification of admin role
      if (name.toLowerCase() === 'admin') {
        return res.status(403).json({ error: "Cannot modify admin role" });
      }

      // Update RolePermissions
      RolePermissions[name] = permissions;
      
      res.json({ 
        message: "Role created successfully",
        role: { name, permissions }
      });
    } catch (error) {
      console.error('Error creating role:', error);
      res.status(500).json({ error: "Failed to create role" });
    }
  });

  app.put("/api/roles/:roleName", authenticateFirebase, requireRole(['admin']), async (req, res) => {
    try {
      const { roleName } = req.params;
      const { permissions } = req.body;
      
      if (roleName.toLowerCase() === 'admin') {
        return res.status(403).json({ error: "Cannot modify admin role" });
      }

      if (!RolePermissions[roleName]) {
        return res.status(404).json({ error: "Role not found" });
      }

      // Update permissions
      RolePermissions[roleName] = permissions;
      
      res.json({ 
        message: "Role updated successfully",
        role: { name: roleName, permissions }
      });
    } catch (error) {
      console.error('Error updating role:', error);
      res.status(500).json({ error: "Failed to update role" });
    }
  });

  // Manager-specific test endpoint
  app.get("/api/manager/branch-stats", 
    authenticateFirebase, 
    validateManagerOperation(['view_analytics', 'view_branch_performance']), 
    async (req, res) => {
      try {
        // Example branch statistics
        const branchStats = {
          appointments: {
            total: 150,
            completed: 120,
            cancelled: 10,
            pending: 20
          },
          revenue: {
            daily: 2500,
            weekly: 15000,
            monthly: 60000
          },
          services: {
            popular: ['Basic Grooming', 'Nail Trimming', 'Bath & Brush'],
            totalProvided: 450
          },
          inventory: {
            lowStock: 5,
            totalItems: 200
          }
        };
        
        res.json({
          success: true,
          data: branchStats
        });
      } catch (error) {
        console.error('Error fetching branch stats:', error);
        res.status(500).json({ 
          error: "Failed to fetch branch statistics",
          message: error instanceof Error ? error.message : "Unknown error"
        });
      }
  });
  app.get("/api/stats", authenticateFirebase, requireRole(['admin', 'manager', 'staff']), validateManagerOperation('view_analytics'), async (req, res) => {
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

import { setUserRole } from "./auth";