import { type Express } from "express";
import { authenticateFirebase, requireRole } from "./middleware/auth";
import path from "path";
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
  ALL_PERMISSIONS,
  getFirebaseAdmin,
  setupAdminUser
} from "./firebase";
import { getAuth } from "firebase-admin/auth";
import { getDatabase } from "firebase-admin/database";
import admin from "firebase-admin";


export function registerRoutes(app: Express) {
  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "healthy" });
  });

  // Setup admin user endpoint - accessible without authentication
  app.post("/api/setup-admin", async (req, res) => {
    try {
      const adminEmail = 'admin@groomery.in';
      console.log('[SETUP-ADMIN] Starting admin user setup for:', adminEmail);
      
      // Get Firebase Admin instance
      const firebaseApp = getFirebaseAdmin();
      console.log('[SETUP-ADMIN] Firebase Admin instance retrieved');
      
      // Setup admin user with default permissions
      await setupAdminUser(adminEmail);
      console.log('[SETUP-ADMIN] Admin user setup completed successfully');
      
      // Initialize role definitions in Realtime Database
      const db = getDatabase(firebaseApp);
      const roleDefsRef = db.ref('role-definitions');
      const roleDefsSnapshot = await roleDefsRef.once('value');
      
      if (!roleDefsSnapshot.exists()) {
        console.log('[SETUP-ADMIN] Initializing role definitions');
        await roleDefsRef.set(InitialRoleConfigs);
      }
      
      res.json({ 
        success: true,
        message: "Admin user setup completed successfully",
        email: adminEmail,
        roles: Object.keys(InitialRoleConfigs)
      });
    } catch (error) {
      console.error('[SETUP-ADMIN] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[SETUP-ADMIN] Detailed error:', errorMessage);
      
      res.status(500).json({ 
        success: false,
        message: "Failed to setup admin user",
        error: errorMessage,
        code: "ADMIN_SETUP_ERROR"
      });
    }
  });

  // Firebase User Management endpoints - Admin only
  app.get("/api/firebase-users", authenticateFirebase, requireRole([RoleTypes.admin]), async (req, res) => {
    try {
      console.log('[FIREBASE-USERS] Starting user fetch request');
      
      // Ensure content type is set to JSON
      res.setHeader('Content-Type', 'application/json');
      
      const app = await getFirebaseAdmin();
      const auth = getAuth(app);
      const db = getDatabase(app);
      
      // Parse pagination parameters with defaults
      const pageSize = Math.min(Number(req.query.pageSize) || 100, 1000);
      const pageToken = req.query.pageToken as string | undefined;
      
      console.log('[FIREBASE-USERS] Fetching users with params:', { pageSize, pageToken });

      // List users from Firebase Auth
      const listUsersResult = await auth.listUsers(pageSize, pageToken);
      
      // Get roles for all users
      const rolesSnapshot = await db.ref('roles').once('value');
      const roles = rolesSnapshot.val() || {};
      
      // Combine user data with roles
      const users = await Promise.all(listUsersResult.users.map(async user => {
        const userRole = roles[user.uid] || { role: 'staff', permissions: [] };
        return {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          role: userRole.role,
          permissions: userRole.permissions,
          disabled: user.disabled,
          lastSignInTime: user.metadata.lastSignInTime,
          creationTime: user.metadata.creationTime
        };
      }));
      
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
        error: error instanceof Error ? error.message : "Unknown error",
        code: "USER_FETCH_ERROR"
      });
    }
  });

  // Role management endpoints
  app.get("/api/roles", authenticateFirebase, requireRole([RoleTypes.admin]), async (_req, res) => {
    try {
      console.log('[ROLES] Starting role fetch request');
      
      const db = admin.database();
      const roleDefinitionsSnapshot = await db.ref('role-definitions').once('value');
      const roleDefinitions = roleDefinitionsSnapshot.val() || {};
      
      console.log('[ROLES] Retrieved role definitions:', roleDefinitions);
      
      // Transform role definitions into the expected format
      const roles = Object.entries(roleDefinitions).map(([name, role]: [string, any]) => ({
        name,
        permissions: Array.isArray(role.permissions) ? role.permissions : [],
        isSystem: role.isSystem || ['admin', 'manager', 'staff', 'receptionist'].includes(name),
        description: role.description || '',
        createdAt: role.createdAt || Date.now(),
        updatedAt: role.updatedAt || Date.now(),
        canEdit: !(['admin', 'manager', 'staff', 'receptionist'].includes(name)) // Only custom roles can be edited
      }));
      
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
      const { permissions } = req.body as { permissions: unknown[] };

      console.log(`[ROLES] Attempting to update role ${roleName} with permissions:`, permissions);

      if (!permissions || !Array.isArray(permissions)) {
        return res.status(400).json({
          message: "Invalid permissions format",
          error: "Permissions must be an array",
          code: "INVALID_FORMAT"
        });
      }

      // Early validation of role name
      const db = admin.database();
      const roleSnapshot = await db.ref(`role-definitions/${roleName}`).once('value');
      
      if (!roleSnapshot.exists()) {
        return res.status(404).json({
          message: "Role not found",
          error: `Role ${roleName} does not exist`,
          code: "ROLE_NOT_FOUND"
        });
      }

      // Prevent updating admin role
      if (roleName === RoleTypes.admin) {
        return res.status(403).json({
          message: "Cannot modify admin role",
          error: "The admin role permissions cannot be modified",
          code: "ADMIN_ROLE_PROTECTED"
        });
      }

      // Validate and ensure type safety of permissions
      const validatedPermissions = validatePermissions(permissions);
      
      if (validatedPermissions.length !== permissions.length) {
        const invalidPerms = permissions.filter(p => !isValidPermission(p));
        console.warn('[ROLES] Invalid permissions detected:', invalidPerms);
        return res.status(400).json({
          message: "Some permissions were invalid",
          error: `Invalid permissions: ${invalidPerms.join(', ')}`,
          validPermissions: ALL_PERMISSIONS,
          acceptedPermissions: validatedPermissions,
          code: "INVALID_PERMISSIONS"
        });
      }

      const currentRole = roleSnapshot.val();
      
      // For system roles, merge with default permissions
      let finalPermissions = [...validatedPermissions];
      if (currentRole.isSystem && roleName in DefaultPermissions) {
        const defaultPerms = DefaultPermissions[roleName as keyof typeof DefaultPermissions];
        finalPermissions = Array.from(new Set([...defaultPerms, ...validatedPermissions]));
        console.log(`[ROLE-UPDATE] Merged permissions for system role ${roleName}:`, finalPermissions);
      }

      // Update role definition in Firebase
      const timestamp = Date.now();
      const updatedRole = {
        ...currentRole,
        name: roleName,
        permissions: finalPermissions,
        updatedAt: timestamp
      };

      // Store update in role history
      const historyRef = db.ref(`role-history/${roleName}`);
      await historyRef.push({
        previousPermissions: currentRole.permissions,
        newPermissions: finalPermissions,
        timestamp,
        updatedBy: req.user?.uid || 'unknown'
      });

      // Update role definition
      await db.ref(`role-definitions/${roleName}`).update(updatedRole);
      console.log('[ROLES] Updated role definition:', updatedRole);

      // Update all users with this role
      const usersRef = db.ref('roles');
      const usersSnapshot = await usersRef.once('value');
      const users = usersSnapshot.val() || {};

      const auth = admin.auth();
      const updatePromises = Object.entries(users)
        .filter(([_, userData]: [string, any]) => userData.role === roleName)
        .map(async ([uid, _]) => {
          try {
            const claims = {
              role: roleName,
              permissions: finalPermissions,
              updatedAt: timestamp
            };
            
            await auth.setCustomUserClaims(uid, claims);
            await usersRef.child(uid).update({
              permissions: finalPermissions,
              updatedAt: timestamp
            });
            
            console.log(`[ROLES] Updated permissions for user ${uid}`);
          } catch (error) {
            console.error(`[ROLES] Failed to update user ${uid}:`, error);
            // Continue with other updates even if one fails
          }
        });

      await Promise.allSettled(updatePromises);

      console.log(`[ROLES] Successfully updated ${roleName} role and associated user permissions`);
      res.json({ 
        message: `Role ${roleName} updated successfully`,
        role: updatedRole,
        permissions: finalPermissions
      });
    } catch (error) {
      console.error('[ROLES] Error updating role:', error);
      res.status(500).json({
        message: "Failed to update role",
        error: error instanceof Error ? error.message : "Unknown error",
        code: "ROLE_UPDATE_ERROR"
      });
    }
  });

  // Create new role
  app.post("/api/roles", authenticateFirebase, requireRole([RoleTypes.admin]), async (req, res) => {
    try {
      const { name, permissions, description } = req.body;
      console.log('[ROLES] Attempting to create role:', { name, permissions, description });

      if (!name || !permissions) {
        return res.status(400).json({
          message: "Name and permissions are required",
          code: "MISSING_FIELDS"
        });
      }

      // Validate role name format
      if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
        return res.status(400).json({
          message: "Role name can only contain letters, numbers, underscores, and hyphens",
          code: "INVALID_NAME_FORMAT"
        });
      }

      // Validate permissions
      const validatedPermissions = validatePermissions(permissions);
      if (validatedPermissions.length !== permissions.length) {
        const invalidPerms = permissions.filter((p: string) => !isValidPermission(p));
        return res.status(400).json({
          message: "Some permissions were invalid",
          code: "INVALID_PERMISSIONS",
          invalidPermissions: invalidPerms,
          validPermissions: ALL_PERMISSIONS
        });
      }

      const db = admin.database();
      const roleRef = db.ref(`role-definitions/${name}`);
      
      // Check if role already exists
      const snapshot = await roleRef.once('value');
      if (snapshot.exists()) {
        return res.status(400).json({
          message: `Role ${name} already exists`,
          code: "ROLE_EXISTS"
        });
      }

      // Prevent creating system roles
      if (name in InitialRoleConfigs) {
        return res.status(403).json({
          message: "Cannot create system roles",
          code: "SYSTEM_ROLE_PROTECTED"
        });
      }

      const timestamp = Date.now();
      const newRole = {
        name,
        permissions: validatedPermissions,
        description: description || '',
        isSystem: false,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      // Create new role
      await roleRef.set(newRole);

      // Create initial history entry
      await db.ref(`role-history/${name}`).push({
        action: 'created',
        permissions: validatedPermissions,
        timestamp,
        createdBy: req.user?.uid || 'unknown'
      });

      console.log(`[ROLES] Successfully created new role:`, newRole);
      
      // Fetch all roles to ensure consistency
      const rolesSnapshot = await db.ref('role-definitions').once('value');
      const roles = rolesSnapshot.val() || {};
      
      // Transform roles for response
      const allRoles = Object.entries(roles).map(([roleName, role]: [string, any]) => ({
        name: roleName,
        permissions: role.permissions || [],
        description: role.description || '',
        isSystem: role.isSystem || false,
        createdAt: role.createdAt || timestamp,
        updatedAt: role.updatedAt || timestamp
      }));

      res.json({
        message: `Role ${name} created successfully`,
        role: newRole,
        // Return all roles to ensure UI is in sync
        allRoles
      });
    } catch (error) {
      console.error('[ROLES] Error creating role:', error);
      res.status(500).json({
        message: "Failed to create role",
        error: error instanceof Error ? error.message : "Unknown error",
        code: "ROLE_CREATION_ERROR"
      });
    }
  });

  // Update user role
  app.post("/api/users/:userId/role", authenticateFirebase, requireRole([RoleTypes.admin]), async (req, res) => {
    try {
      const { userId } = req.params;
      const { role, permissions } = req.body as { 
        role: RoleTypes;
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
      let validatedPermissions: Permission[] | undefined;
      if (permissions) {
        validatedPermissions = validatePermissions(permissions);
        
        if (validatedPermissions.length !== permissions.length) {
          const invalidPerms = permissions.filter(p => !isValidPermission(p));
          return res.status(400).json({
            message: "Invalid permissions specified",
            code: "INVALID_PERMISSIONS",
            invalidPermissions: invalidPerms,
            validPermissions: ALL_PERMISSIONS
          });
        }
      }

      // Update user role with validated permissions
      const result = await updateUserRole(userId, role, validatedPermissions);
      
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

  // User management endpoints
  app.post("/api/users/:userId/disable", authenticateFirebase, requireRole([RoleTypes.admin]), async (req, res) => {
    try {
      const { userId } = req.params;
      const { disabled } = req.body;
      
      const auth = getAuth();
      await auth.updateUser(userId, { disabled });
      
      res.json({ message: `User ${disabled ? 'disabled' : 'enabled'} successfully` });
    } catch (error) {
      console.error('[USER-DISABLE] Error:', error);
      res.status(500).json({ 
        message: "Failed to update user status",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/users/:userId/reset-password", authenticateFirebase, requireRole([RoleTypes.admin]), async (req, res) => {
    try {
      const { userId } = req.params;
      const auth = getAuth();
      const user = await auth.generatePasswordResetLink((await auth.getUser(userId)).email || '');
      
      res.json({ message: "Password reset link generated successfully", resetLink: user });
    } catch (error) {
      console.error('[PASSWORD-RESET] Error:', error);
      res.status(500).json({ 
        message: "Failed to generate password reset link",
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