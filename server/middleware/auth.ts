import { Request, Response, NextFunction } from 'express';
import { getFirebaseAdmin } from '../firebase';
import { type RoleType, type Permission, users, roles } from '../../db/schema';
import { RolePermissions } from '../routes';
import { db } from "../../db";
import { eq } from "drizzle-orm";

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: FirebaseUser & {
        role: RoleType;
        permissions: Permission[];
        roleId: string;
      };
    }
  }
}

interface FirebaseUser {
  uid: string;
  email?: string | null;
  displayName?: string | null;
}

// Manager-specific restricted paths
const userManagementPaths = [
  '/api/users',
  '/api/setup-admin',
  '/api/roles',
  '/api/auth/roles',
  '/api/users/role',
  '/api/staff/role',
  '/api/staff/permissions',
  '/api/auth/admin',
  '/api/auth/setup',
  '/api/auth/permissions'
];

// Helper function to check if a path is restricted
const isRestrictedPath = (path: string) => 
  userManagementPaths.some(restrictedPath => path.startsWith(restrictedPath));

// Firebase authentication middleware
export async function authenticateFirebase(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ 
        message: 'No token provided',
        code: 'NO_TOKEN'
      });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const firebaseAdmin = getFirebaseAdmin();
    
    if (!firebaseAdmin) {
      console.error('Firebase Admin not initialized');
      return res.status(500).json({ 
        message: 'Authentication service unavailable',
        code: 'AUTH_SERVICE_ERROR'
      });
    }

    const auth = firebaseAdmin.auth();
    
    try {
      console.log('🔍 Verifying Firebase token...');
      const decodedToken = await auth.verifyIdToken(idToken);
      const firebaseUser = await auth.getUser(decodedToken.uid);
      
      console.log(`🔍 Fetching user data for ${firebaseUser.email}...`);
      
      // Fetch user from database with role information
      const result = await db
        .select({
          user: {
            id: users.id,
            email: users.email,
            name: users.name,
            roleId: users.roleId,
            isActive: users.isActive
          },
          role: {
            id: roles.id,
            name: roles.name,
            permissions: roles.permissions
          }
        })
        .from(users)
        .leftJoin(roles, eq(users.roleId, roles.id))
        .where(eq(users.id, firebaseUser.uid));

      let dbUser = result[0];

      if (!dbUser) {
        console.log(`📝 Creating new user record for ${firebaseUser.email}...`);
        // Create user in database if not exists with default staff role
        const [newUser] = await db.insert(users)
          .values({
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Unknown User',
            roleId: 'staff', // Default role
            phone: '',
            isActive: true
          })
          .returning();

        // Fetch the newly created user with role information
        const [userWithRole] = await db
          .select({
            user: {
              id: users.id,
              email: users.email,
              name: users.name,
              roleId: users.roleId,
              isActive: users.isActive
            },
            role: {
              id: roles.id,
              name: roles.name,
              permissions: roles.permissions
            }
          })
          .from(users)
          .leftJoin(roles, eq(users.roleId, roles.id))
          .where(eq(users.id, newUser.id));
          
        dbUser = userWithRole;
      }

      if (!dbUser?.role) {
        console.error(`❌ No role found for user ${firebaseUser.email}`);
        return res.status(500).json({
          message: 'User role not found',
          code: 'ROLE_NOT_FOUND'
        });
      }

      // Check if user is active
      if (!dbUser.user.isActive) {
        console.error(`❌ User ${firebaseUser.email} is inactive`);
        return res.status(403).json({
          message: 'User account is inactive',
          code: 'INACTIVE_USER'
        });
      }

      req.user = {
        ...firebaseUser,
        role: dbUser.role.name as RoleType,
        permissions: dbUser.role.permissions as Permission[],
        roleId: dbUser.user.roleId
      };
      
      console.log(`🟢 Authenticated user: ${firebaseUser.email} (${dbUser.role.name})`);
      next();
    } catch (verifyError) {
      console.error('Token verification failed:', verifyError);
      return res.status(401).json({ 
        message: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ 
      message: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
  }
}

// Role-based access control middleware
export function requireRole(allowedRoles: RoleType[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      console.error('❌ No authenticated user found in request');
      return res.status(401).json({ 
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    console.log(`🔒 Checking role access for ${req.user.email} (${req.user.role})`);
    console.log(`📋 Required roles: ${allowedRoles.join(', ')}`);

    // Admin has access to everything
    if (req.user.role === 'admin') {
      console.log('✅ Admin access granted');
      return next();
    }

    // For manager role, check restricted paths
    if (req.user.role === 'manager' && isRestrictedPath(req.path)) {
      console.log(`❌ Manager restricted from accessing: ${req.path}`);
      return res.status(403).json({
        message: 'Managers cannot access user management features',
        code: 'MANAGER_RESTRICTED',
        path: req.path
      });
    }

    // Check if user's role is allowed
    if (!allowedRoles.includes(req.user.role)) {
      console.log(`❌ Access denied for role ${req.user.role}`);
      return res.status(403).json({
        message: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
        code: 'INSUFFICIENT_ROLE',
        requiredRoles: allowedRoles,
        currentRole: req.user.role,
        userPermissions: req.user.permissions
      });
    }

    console.log('✅ Role check passed');
    next();
  };
}

// Permission-based access control middleware
export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    if (req.user.role === 'admin') {
      return next(); // Admin has all permissions
    }

    const rolePermissions = RolePermissions[req.user.role];
    if (!rolePermissions?.includes(permission) && !rolePermissions?.includes('all')) {
      return res.status(403).json({
        message: `Access denied. Missing required permission: ${permission}`,
        code: 'INSUFFICIENT_PERMISSION',
        requiredPermission: permission,
        userPermissions: req.user.permissions
      });
    }

    next();
  };
}

// User management middleware
export function validateUserManagement(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ 
      message: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  // Only admin can manage users
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      message: 'Only administrators can manage users',
      code: 'ADMIN_REQUIRED',
      currentRole: req.user.role
    });
  }

  next();
}

// Manager operation validation middleware with enhanced checks
export function validateManagerOperation(operation: string | string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    // Admin has full access
    if (req.user.role === 'admin') {
      return next();
    }

    // Enforce manager role
    if (req.user.role !== 'manager') {
      return res.status(403).json({
        message: 'This operation requires manager privileges',
        code: 'MANAGER_REQUIRED',
        requiredRole: 'manager',
        currentRole: req.user.role
      });
    }

    // Handle both single operation and multiple required operations
    const requiredOperations = Array.isArray(operation) ? operation : [operation];
    const managerPermissions = RolePermissions.manager;
    
    // Check if manager has all required permissions
    const missingPermissions = requiredOperations.filter(op => !managerPermissions.includes(op));
    
    if (missingPermissions.length > 0) {
      return res.status(403).json({
        message: 'Insufficient permissions for this operation',
        code: 'INSUFFICIENT_MANAGER_PERMISSION',
        requiredOperations,
        missingPermissions,
        userPermissions: managerPermissions
      });
    }

    // Check for branch-specific operations if branchId is present
    if (req.user.branchId && req.params.branchId && req.user.branchId !== parseInt(req.params.branchId)) {
      return res.status(403).json({
        message: 'Access restricted to assigned branch only',
        code: 'BRANCH_ACCESS_DENIED',
        userBranch: req.user.branchId,
        requestedBranch: req.params.branchId
      });
    }

    next();
  };
}