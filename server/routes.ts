import { type Express } from "express";
import { authenticateFirebase, requireRole } from "./middleware/auth";
import { 
  RoleTypes, 
  DefaultPermissions, 
  getUserRole, 
  updateUserRole, 
  listAllUsers,
  getRoleDefinitions,
  updateRoleDefinition,
  InitialRoleConfigs,
  Permission,
  validatePermissions,
  isValidPermission,
  ALL_PERMISSIONS
} from "./firebase";
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
      console.log('[ROLES] Starting role fetch request');
      
      // Get roles from Firebase
      const roleDefinitions = await getRoleDefinitions();
      
      if (!roleDefinitions) {
        console.error('[ROLES] No role definitions found');
        return res.status(500).json({ 
          message: "No roles found in the system",
          code: "NO_ROLES_FOUND"
        });
      }
      
      // Transform role definitions into the expected format and ensure system roles are included
      const roles = Object.entries(roleDefinitions).map(([name, role]: [string, any]) => ({
        name,
        permissions: role.permissions || DefaultPermissions[name as keyof typeof DefaultPermissions] || [],
        isSystem: role.isSystem || false,
        description: role.description || '',
        createdAt: role.createdAt || Date.now(),
        updatedAt: role.updatedAt || Date.now()
      }));
      
      // Add any missing system roles
      Object.entries(InitialRoleConfigs).forEach(([name, config]) => {
        if (!roles.find(r => r.name === name)) {
          roles.push({
            name,
            permissions: config.permissions,
            isSystem: true,
            description: '',
            createdAt: Date.now(),
            updatedAt: Date.now()
          });
        }
      });
      
      console.log('[ROLES] Successfully fetched roles:', roles.map(r => r.name));
      res.json(roles);
    } catch (error) {
      console.error('[ROLES] Error fetching roles:', error);
      res.status(500).json({ 
        message: "Failed to fetch roles",
        error: error instanceof Error ? error.message : "Unknown error",
        code: "ROLE_FETCH_ERROR"
      });
    }
  });

  // Update role permissions
  app.put("/api/roles/:roleName", authenticateFirebase, requireRole([RoleTypes.admin]), async (req, res) => {
    try {
      const { roleName } = req.params;
      const { permissions } = req.body as { permissions: string[] };

      if (!permissions || !Array.isArray(permissions)) {
        return res.status(400).json({
          message: "Invalid permissions format",
          error: "Permissions must be an array"
        });
      }

      console.log(`[ROLES] Updating role ${roleName} with permissions:`, permissions);

      // Validate and ensure type safety of permissions
      const validatedPermissions = validatePermissions(permissions);
      
      if (validatedPermissions.length !== permissions.length) {
        const invalidPerms = permissions.filter(p => !isValidPermission(p));
        console.warn('[ROLES] Invalid permissions detected:', invalidPerms);
        return res.status(400).json({
          message: "Some permissions were invalid",
          error: `Invalid permissions: ${invalidPerms.join(', ')}`,
          validPermissions: ALL_PERMISSIONS,
          acceptedPermissions: validatedPermissions
        });
      }

      // Update role definition in Firebase
      const updatedRole = await updateRoleDefinition(roleName, validatedPermissions);

      // For system roles, ensure core permissions are maintained
      let finalPermissions = [...validatedPermissions];
      if (roleName in DefaultPermissions) {
        const defaultPerms = DefaultPermissions[roleName as keyof typeof DefaultPermissions];
        finalPermissions = Array.from(new Set([...defaultPerms, ...validatedPermissions]));
      }

      // Update role definition in Firebase
      const updatedRole = await updateRoleDefinition(roleName, finalPermissions);

      // Update all users with this role to have the new permissions
      const auth = admin.auth();
      const db = admin.database();
      const usersSnapshot = await db.ref('roles').once('value');
      const users = usersSnapshot.val() || {};

      const updatePromises = Object.entries(users)
        .filter(([_, userData]: [string, any]) => userData.role === roleName)
        .map(async ([uid, _]) => {
          const claims = {
            role: roleName,
            permissions: finalPermissions,
            updatedAt: Date.now()
          };
          
          await auth.setCustomUserClaims(uid, claims);
          return db.ref(`roles/${uid}`).update({
            permissions: finalPermissions,
            updatedAt: Date.now()
          });
        });

      await Promise.all(updatePromises);

      console.log(`[ROLES] Successfully updated ${roleName} role and user permissions`);
      res.json({ 
        message: `Role ${roleName} updated successfully`,
        role: updatedRole,
        permissions: finalPermissions
      });
    } catch (error) {
      console.error('[ROLES] Error updating role:', error);
      res.status(500).json({
        message: "Failed to update role",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Create new role
  app.post("/api/roles", authenticateFirebase, requireRole([RoleTypes.admin]), async (req, res) => {
    try {
      const { name, permissions } = req.body;

      if (!name || !permissions) {
        return res.status(400).json({
          message: "Name and permissions are required"
        });
      }

      const db = admin.database();
      const roleRef = db.ref(`role-definitions/${name}`);
      
      // Check if role already exists
      const snapshot = await roleRef.once('value');
      if (snapshot.exists()) {
        return res.status(400).json({
          message: `Role ${name} already exists`
        });
      }

      // Create new role
      await roleRef.set({
        name,
        permissions,
        isSystem: false,
        createdAt: admin.database.ServerValue.TIMESTAMP,
        updatedAt: admin.database.ServerValue.TIMESTAMP
      });

      console.log(`[ROLES] Successfully created new role: ${name}`);
      res.json({
        message: `Role ${name} created successfully`,
        name,
        permissions
      });
    } catch (error) {
      console.error('[ROLES] Error creating role:', error);
      res.status(500).json({
        message: "Failed to create role",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Update user role
  app.post("/api/users/:userId/role", authenticateFirebase, requireRole([RoleTypes.admin]), async (req, res) => {
    try {
      const { userId } = req.params;
      const { role, permissions } = req.body as { 
        role: keyof typeof RoleTypes;
        permissions?: string[];
      };

      console.log('[ROLE-UPDATE] Received update request:', { userId, role, permissions });

      // Validate role
      if (!role || !Object.values(RoleTypes).includes(role)) {
        return res.status(400).json({ 
          message: "Invalid role specified",
          code: "INVALID_ROLE",
          validRoles: Object.values(RoleTypes)
        });
      }

      // Validate permissions if provided
      if (permissions) {
        const allValidPermissions = new Set(
          Object.values(DefaultPermissions).flat()
        );
        
        const invalidPermissions = permissions.filter(p => !Array.from(allValidPermissions).includes(p));
        if (invalidPermissions.length > 0) {
          return res.status(400).json({
            message: "Invalid permissions specified",
            code: "INVALID_PERMISSIONS",
            invalidPermissions,
            validPermissions: Array.from(allValidPermissions)
          });
        }
      }

      // Update user role with permissions
      const result = await updateUserRole(userId, role, permissions);
      
      console.log('[ROLE-UPDATE] Update successful:', result);
      
      res.json({ 
        message: "Role and permissions updated successfully",
        ...result
      });
    } catch (error) {
      console.error('[ROLE-UPDATE] Error:', error);
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