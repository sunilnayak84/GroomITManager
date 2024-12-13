import { type Express } from "express";
import { db } from "../db";
import { appointments, customers, pets, users, roles, type RoleType, type Permission } from "../db/schema";
import { and, count, eq, gte } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { authenticateFirebase, requireRole } from "./middleware/auth";
import { getFirebaseAdmin } from './firebase';
import type { Auth } from 'firebase-admin/auth';
import admin from 'firebase-admin';



// Role descriptions for better UI display
const RoleDescriptions: Record<RoleType, string> = {
  admin: 'Full system access with user management capabilities',
  manager: 'Branch management with staff oversight and reporting access',
  staff: 'Basic service provider access with appointment management',
  receptionist: 'Front desk operations with customer and appointment handling'
};

// Helper function to get role description
function getRoleDescription(role: RoleType): string {
  return RoleDescriptions[role] || 'No description available';
}

// Define roles and their permissions
export const RolePermissions: Record<RoleType, Permission[]> = {
  admin: [
    'manage_appointments', 'view_appointments', 'create_appointments', 'cancel_appointments',
    'manage_customers', 'view_customers', 'create_customers', 'edit_customer_info',
    'manage_services', 'view_services', 'create_services', 'edit_services',
    'manage_inventory', 'view_inventory', 'update_stock', 'manage_consumables',
    'manage_staff_schedule', 'view_staff_schedule', 'manage_own_schedule',
    'view_analytics', 'view_reports', 'view_financial_reports', 'all'
  ] as Permission[],
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
      
      const pageSize = Math.min(Number(req.query.pageSize) || 100, 1000);
      const pageToken = req.query.pageToken as string | undefined;
      
      console.log('[FIREBASE-USERS] Fetching users with params:', { pageSize, pageToken });

      const firebaseAdmin = getFirebaseAdmin();
      if (!firebaseAdmin) {
        throw new Error('Firebase Admin not initialized');
      }
      
      const auth = firebaseAdmin.auth();
      // List users with pagination
      const result = await auth.listUsers(pageSize, pageToken);
      console.log(`[FIREBASE-USERS] Found ${result.users.length} users`);
      
      // Process users in batches to avoid memory issues
      const processedUsers = await Promise.all(
        result.users.map(async (userRecord) => {
          try {
            const customClaims = userRecord.customClaims || {};
            return {
              uid: userRecord.uid,
              email: userRecord.email,
              displayName: userRecord.displayName || userRecord.email?.split('@')[0] || 'Unknown User',
              role: (customClaims.role as RoleType) || 'staff',
              permissions: (customClaims.permissions as Permission[]) || [],
              metadata: {
                lastSignInTime: userRecord.metadata.lastSignInTime,
                creationTime: userRecord.metadata.creationTime
              },
              disabled: userRecord.disabled,
              emailVerified: userRecord.emailVerified
            };
          } catch (err) {
            console.error(`Error processing user ${userRecord.uid}:`, err);
            return null;
          }
        })
      );

      // Filter out any failed user processing
      const users = processedUsers.filter((user): user is NonNullable<typeof user> => user !== null);
      
      console.log(`[FIREBASE-USERS] Successfully processed ${users.length} users`);
      
      res.json({
        users,
        pageToken: result.pageToken,
        hasNextPage: !!result.pageToken
      });
    } catch (error) {
      console.error('[FIREBASE-USERS] Error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('auth/insufficient-permission')) {
          return res.status(403).json({
            message: "Insufficient permissions to list users",
            code: "INSUFFICIENT_PERMISSION"
          });
        }
      }
      
      res.status(500).json({ 
        message: "Failed to fetch users",
        error: error instanceof Error ? error.message : "Unknown error",
        code: "FETCH_USERS_ERROR"
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
  // Update role permissions endpoint
  app.post("/api/roles/:roleName/permissions", authenticateFirebase, requireRole(['admin']), async (req, res) => {
    try {
      const { roleName } = req.params;
      const { permissions } = req.body as { permissions: Permission[] };

      console.log(`[ROLE-UPDATE] Updating permissions for role ${roleName}:`, permissions);

      // Validate role exists and is not admin (admin permissions cannot be modified)
      if (roleName === 'admin') {
        return res.status(403).json({ 
          message: "Admin role permissions cannot be modified",
          code: "ADMIN_ROLE_PROTECTED"
        });
      }

      // Validate role type
      const validRoles = ['manager', 'staff', 'receptionist'] as const;
      if (!validRoles.includes(roleName as typeof validRoles[number])) {
        return res.status(400).json({ 
          message: "Invalid role specified",
          code: "INVALID_ROLE",
          validRoles
        });
      }

      // Validate permissions format and content
      if (!Array.isArray(permissions)) {
        return res.status(400).json({
          message: "Permissions must be an array",
          code: "INVALID_PERMISSIONS_FORMAT"
        });
      }

      // Get all valid permissions from the schema (excluding 'all')
      const allPermissions = Object.values(RolePermissions['admin']).filter(p => p !== 'all');
      
      // Validate each permission
      const invalidPermissions = permissions.filter(p => !allPermissions.includes(p));

      if (invalidPermissions.length > 0) {
        return res.status(400).json({
          message: "Invalid permissions provided",
          code: "INVALID_PERMISSIONS",
          invalidPermissions,
          validPermissions: allPermissions
        });
      }

      // Start a transaction to update both database and Firebase claims
      const result = await db.transaction(async (tx) => {
        // Update role in database
        const [updatedRole] = await tx
          .update(roles)
          .set({
            permissions: permissions,
            updatedAt: new Date()
          })
          .where(eq(roles.id, roleName))
          .returning();

        if (!updatedRole) {
          throw new Error('Failed to update role in database');
        }

        return updatedRole;
      });

      console.log(`[ROLE-UPDATE] Successfully updated role ${roleName} in database:`, result);

      // Get all users with this role to update their claims
      const usersWithRole = await db
        .select()
        .from(users)
        .where(eq(users.roleId, roleName));

      // Get Firebase Admin instance
      const firebaseAdmin = getFirebaseAdmin();
      if (!firebaseAdmin) {
        throw new Error('Firebase Admin not initialized');
      }

      const auth = firebaseAdmin.auth();
      
      // Update Firebase custom claims for all affected users
      const updatePromises = usersWithRole.map(async (user) => {
        try {
          await auth.setCustomUserClaims(user.id, {
            role: roleName,
            permissions: permissions,
            updatedAt: new Date().toISOString()
          });
          console.log(`[ROLE-UPDATE] Updated claims for user ${user.id}`);
          return { userId: user.id, success: true };
        } catch (error) {
          console.error(`[ROLE-UPDATE] Failed to update claims for user ${user.id}:`, error);
          return { userId: user.id, success: false, error };
        }
      });

      const updateResults = await Promise.all(updatePromises);

      const successfulUpdates = updateResults.filter((result) => result.success);
      const failedUpdates = updateResults.filter((result) => !result.success);

      res.json({
        message: "Role permissions updated successfully",
        role: result,
        affectedUsers: usersWithRole.length,
        successfulUpdates: successfulUpdates.length,
        failedUpdates: failedUpdates.length > 0 ? failedUpdates : undefined
      });

    } catch (error) {
      console.error('[ROLE-UPDATE] Error:', error);
      res.status(500).json({ 
        message: "Failed to update role permissions",
        error: error instanceof Error ? error.message : "Unknown error",
        code: "UPDATE_ROLE_ERROR"
      });
    }
  });
      if (invalidPermissions.length > 0) {
        return res.status(400).json({
          message: "Invalid permissions provided",
          code: "INVALID_PERMISSIONS",
          invalidPermissions,
          validPermissions: allPermissions
        });
      }

      // Start a transaction for atomic updates
      const result = await db.transaction(async (tx) => {
        // Update role in database
        const [updatedRole] = await tx
          .update(roles)
          .set({
            permissions: permissions as Permission[],
            updatedAt: new Date()
          })
          .where(eq(roles.name, roleName))
          .returning();

        if (!updatedRole) {
          throw new Error('Failed to update role in database');
        }

        // Get all users with this role
        const usersWithRole = await tx
          .select()
          .from(users)
          .where(eq(users.roleId, roleName));

        return { updatedRole, usersWithRole };
      });

      console.log(`[ROLE-UPDATE] Successfully updated role ${roleName} in database:`, result.updatedRole);

      // Get Firebase Admin instance
      const firebaseAdmin = getFirebaseAdmin();
      if (!firebaseAdmin) {
        throw new Error('Firebase Admin not initialized');
      }

      const auth = firebaseAdmin.auth();
      
      // Update Firebase custom claims for all affected users
      const updatePromises = result.usersWithRole.map(async (user) => {
        try {
          await auth.setCustomUserClaims(user.id, {
            role: roleName,
            permissions: permissions,
            updatedAt: new Date().toISOString()
          });
          console.log(`[ROLE-UPDATE] Updated claims for user ${user.id}`);
          return { userId: user.id, success: true };
        } catch (error) {
          console.error(`[ROLE-UPDATE] Failed to update claims for user ${user.id}:`, error);
          throw error;
        }
      });

      const updateResults = await Promise.allSettled(updatePromises);

      const successfulUpdates = updateResults.filter(
        (result): result is PromiseFulfilledResult<{ userId: string; success: true }> => 
          result.status === 'fulfilled'
      );

      const failedUpdates = updateResults.filter(
        (result): result is PromiseRejectedResult => 
          result.status === 'rejected'
      );

      res.json({
        message: "Role permissions updated successfully",
        role: result.updatedRole,
        affectedUsers: result.usersWithRole.length,
        successfulUpdates: successfulUpdates.length,
        failedUpdates: failedUpdates.length > 0 ? failedUpdates.map(f => ({
          userId: f.reason.userId,
          error: f.reason.message
        })) : undefined
      });

    } catch (error) {
      console.error('[ROLE-UPDATE] Error:', error);
      res.status(500).json({ 
        message: "Failed to update role permissions",
        error: error instanceof Error ? error.message : "Unknown error",
        code: "UPDATE_ROLE_ERROR"
      });
    }
  });


  // Update user role and permissions endpoint
  app.post("/api/users/:userId/role", authenticateFirebase, requireRole(['admin']), async (req, res) => {
    try {
      const { userId } = req.params;
      const { role, customPermissions } = req.body as { role: RoleType; customPermissions?: Permission[] };

      // Validate role
      if (!role || !Object.keys(RolePermissions).includes(role)) {
        return res.status(400).json({ 
          message: "Invalid role specified",
          code: "INVALID_ROLE",
          validRoles: Object.keys(RolePermissions)
        });
      }

      const firebaseAdmin = getFirebaseAdmin();
if (!firebaseAdmin) {
  throw new Error('Firebase Admin not initialized');
}
const auth = firebaseAdmin.auth();
      
      // Verify user exists
      try {
        await auth.getUser(userId);
      } catch (error) {
        return res.status(404).json({
          message: "User not found",
          code: "USER_NOT_FOUND"
        });
      }

      // Get permissions for the role, allowing for custom permissions if provided
      const basePermissions = RolePermissions[role] as Permission[];
      const permissions = (customPermissions || basePermissions) as Permission[];
      const timestamp = new Date().toISOString();

      // Update user in database first
      await db
        .update(users)
        .set({
          roleId: role,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));

      // Update user claims atomically in Firebase
      await auth.setCustomUserClaims(userId, {
        role,
        permissions,
        updatedAt: timestamp,
        updatedBy: req.user?.id // Track who made the change using the ID from our database
      });

      // Force token refresh to ensure changes take effect
      await auth.revokeRefreshTokens(userId);

      // Get updated user to verify changes
      const updatedUser = await auth.getUser(userId);
      const [dbUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));

      console.log(`Role updated successfully for user ${userId}`, {
        role,
        permissions,
        updatedAt: timestamp
      });

      res.json({ 
        message: "Role and permissions updated successfully",
        user: {
          uid: userId,
          role,
          permissions,
          updatedAt: timestamp,
          databaseUser: dbUser,
          claims: updatedUser.customClaims
        }
      });
    } catch (error) {
      console.error('[ROLE-UPDATE] Error updating user role:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('auth/insufficient-permission')) {
          return res.status(403).json({
            message: "Insufficient permissions to update user role",
            code: "INSUFFICIENT_PERMISSION"
          });
        }
        
        if (error.message.includes('auth/invalid-uid')) {
          return res.status(400).json({
            message: "Invalid user ID format",
            code: "INVALID_USER_ID"
          });
        }
      }
      
      res.status(500).json({ 
        message: "Failed to update user role",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get available roles endpoint
  app.get("/api/roles/available", authenticateFirebase, requireRole(['admin']), async (req, res) => {
    try {
      const roles = Object.entries(RolePermissions).map(([role, permissions]) => ({
        name: role,
        permissions,
        description: getRoleDescription(role as RoleType)
      }));
      
      res.json(roles);
    } catch (error) {
      console.error('[ROLES] Error fetching available roles:', error);
      res.status(500).json({ 
        message: "Failed to fetch roles",
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