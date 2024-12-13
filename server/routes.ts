import { type Express } from "express";
import { db } from "../db";
import { appointments, customers, pets, users } from "@db/schema";
import { and, count, eq, gte } from "drizzle-orm";
import admin from "firebase-admin";
import { sql } from "drizzle-orm";
import { authenticateFirebase, requireRole } from "./middleware/auth";

// Define role types
type RoleType = 'admin' | 'manager' | 'staff' | 'receptionist';

// Define permission types
type Permission = 
  | 'manage_appointments' | 'view_appointments' | 'create_appointments' | 'cancel_appointments'
  | 'manage_customers' | 'view_customers' | 'create_customers' | 'edit_customer_info'
  | 'manage_services' | 'view_services' | 'create_services' | 'edit_services'
  | 'manage_inventory' | 'view_inventory' | 'update_stock' | 'manage_consumables'
  | 'manage_staff_schedule' | 'view_staff_schedule' | 'manage_own_schedule'
  | 'view_analytics' | 'view_reports' | 'view_financial_reports' | 'all';

// Define roles and their permissions
export const RolePermissions: Record<RoleType, Permission[]> = {
  admin: [
    'manage_appointments', 'view_appointments', 'create_appointments', 'cancel_appointments',
    'manage_customers', 'view_customers', 'create_customers', 'edit_customer_info',
    'manage_services', 'view_services', 'create_services', 'edit_services',
    'manage_inventory', 'view_inventory', 'update_stock', 'manage_consumables',
    'manage_staff_schedule', 'view_staff_schedule', 'manage_own_schedule',
    'view_analytics', 'view_reports', 'view_financial_reports', 'all'
  ],
  manager: [
    'view_appointments', 'create_appointments', 'cancel_appointments',
    'view_customers', 'create_customers', 'edit_customer_info',
    'view_services', 'view_inventory', 'update_stock',
    'manage_staff_schedule', 'view_staff_schedule', 'manage_own_schedule',
    'view_analytics'
  ],
  staff: [
    'view_appointments', 'create_appointments',
    'view_customers', 'create_customers',
    'view_services', 'view_inventory',
    'manage_own_schedule'
  ],
  receptionist: [
    'view_appointments', 'create_appointments',
    'view_customers', 'create_customers',
    'view_services'
  ]
};

export function registerRoutes(app: Express) {
  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "healthy" });
  });

  // Firebase User Management endpoints - Admin only
  app.get("/api/firebase-users", authenticateFirebase, requireRole(['admin']), async (req, res) => {
    try {
      console.log('[FIREBASE-USERS] Starting user fetch request');
      
      // Parse pagination parameters with defaults
      const pageSize = Math.min(Number(req.query.pageSize) || 100, 1000);
      const pageToken = req.query.pageToken as string | undefined;
      
      console.log('[FIREBASE-USERS] Fetching users with params:', { pageSize, pageToken });

      // List users from Firebase Admin SDK
      const listUsersResult = await admin.auth().listUsers(pageSize, pageToken);
      
      // Process users with their custom claims
      const users = await Promise.all(
        listUsersResult.users.map(async (user) => {
          const customClaims = (await admin.auth().getUser(user.uid)).customClaims || {};
          return {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email?.split('@')[0] || 'Unknown User',
            role: customClaims.role || 'user',
            permissions: customClaims.permissions || [],
            disabled: user.disabled,
            lastSignInTime: user.metadata.lastSignInTime,
            creationTime: user.metadata.creationTime
          };
        })
      );

      console.log('[FIREBASE-USERS] Successfully fetched users:', users.length);
      
      res.json({
        users,
        pageToken: listUsersResult.pageToken,
        hasNextPage: !!listUsersResult.pageToken
      });
    } catch (error) {
      console.error('[FIREBASE-USERS] Error fetching users:', error);
      res.status(500).json({ 
        message: "Failed to fetch users",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Role management endpoints
  app.get("/api/roles", authenticateFirebase, requireRole(['admin']), async (req, res) => {
    try {
      console.log('[ROLES] Fetching roles');
      const roles = Object.entries(RolePermissions).map(([role, permissions]) => ({
        name: role,
        permissions
      }));
      res.json(roles);
    } catch (error) {
      console.error('[ROLES] Error fetching roles:', error);
      res.status(500).json({ 
        message: "Failed to fetch roles",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/users/:userId/role", authenticateFirebase, requireRole(['admin']), async (req, res) => {
    try {
      const { userId } = req.params;
      const { role } = req.body as { role: RoleType };

      if (!role || !Object.keys(RolePermissions).includes(role)) {
        return res.status(400).json({ 
          message: "Invalid role specified",
          code: "INVALID_ROLE"
        });
      }

      // Get permissions for the role
      const permissions = RolePermissions[role];

      // Update user claims
      await admin.auth().setCustomUserClaims(userId, {
        role,
        permissions,
        updatedAt: new Date().toISOString()
      });

      // Force token refresh
      await admin.auth().revokeRefreshTokens(userId);

      res.json({ 
        message: "Role updated successfully",
        role,
        permissions
      });
    } catch (error) {
      console.error('Error updating user role:', error);
      res.status(500).json({ 
        message: "Failed to update user role",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get current user profile
  app.get("/api/me", authenticateFirebase, (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json(req.user);
  });

  // Protected routes middleware
  app.use(['/api/appointments', '/api/customers', '/api/pets', '/api/stats'], authenticateFirebase);

  // Stats endpoints
  app.get("/api/stats", authenticateFirebase, requireRole(['admin', 'manager', 'staff']), async (req, res) => {
    try {
      const appointmentResult = await db
        .select({ value: count() })
        .from(appointments);
      const appointmentCount = appointmentResult[0]?.value ?? 0;

      const customerResult = await db
        .select({ value: count() })
        .from(customers);
      const customerCount = customerResult[0]?.value ?? 0;

      const completedResult = await db
        .select({ value: count() })
        .from(appointments)
        .where(eq(appointments.status, "completed"));
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
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const data = days.map(name => ({ name, total: Math.floor(Math.random() * 10) }));
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch appointment stats" });
    }
  });

  // Appointments routes
  app.get("/api/appointments", authenticateFirebase, async (req, res) => {
    try {
      const allAppointments = await db
        .select({
          id: appointments.id,
          status: appointments.status,
          notes: appointments.notes,
          pet: {
            id: pets.id,
            name: pets.name,
            breed: pets.breed,
            imageUrl: pets.imageUrl
          },
          customer: {
            id: customers.id,
            name: sql<string>`${customers.firstName} || ' ' || ${customers.lastName}`
          }
        })
        .from(appointments)
        .leftJoin(pets, eq(appointments.petId, pets.id))
        .leftJoin(customers, eq(pets.customerId, customers.id));
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
