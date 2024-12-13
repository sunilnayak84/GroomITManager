import { type Express } from "express";
import { authenticateFirebase, requireRole } from "./middleware/auth";
import { RoleTypes, DefaultPermissions, getUserRole, updateUserRole, listAllUsers } from "./firebase";
import admin from "firebase-admin";

export function registerRoutes(app: Express) {
  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "healthy" });
  });

  // Firebase User Management endpoints - Admin only
  app.get("/api/firebase-users", authenticateFirebase, requireRole([RoleTypes.admin]), async (req, res) => {
    try {
      console.log('[FIREBASE-USERS] Starting user fetch request');
      
      // Parse pagination parameters with defaults
      const pageSize = Math.min(Number(req.query.pageSize) || 100, 1000);
      const pageToken = req.query.pageToken as string | undefined;
      
      console.log('[FIREBASE-USERS] Fetching users with params:', { pageSize, pageToken });

      const firebaseApp = admin.app();
      
      // Use the new listAllUsers function
      const { users, pageToken: nextPageToken } = await listAllUsers(pageSize, pageToken);
      
      console.log('[FIREBASE-USERS] Successfully fetched users:', users.length);
      
      res.json({
        users,
        pageToken: nextPageToken,
        hasNextPage: !!nextPageToken
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
  app.get("/api/roles", authenticateFirebase, requireRole([RoleTypes.admin]), async (_req, res) => {
    try {
      console.log('[ROLES] Fetching roles');
      const roles = Object.entries(DefaultPermissions).map(([role, permissions]) => ({
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

  // Update user role
  app.post("/api/users/:userId/role", authenticateFirebase, requireRole([RoleTypes.admin]), async (req, res) => {
    try {
      const { userId } = req.params;
      const { role } = req.body as { role: keyof typeof RoleTypes };

      if (!role || !Object.values(RoleTypes).includes(role)) {
        return res.status(400).json({ 
          message: "Invalid role specified",
          code: "INVALID_ROLE",
          validRoles: Object.values(RoleTypes)
        });
      }

      // Update user role in Realtime Database
      const result = await updateUserRole(userId, role);

      res.json({ 
        message: "Role updated successfully",
        ...result
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
}
