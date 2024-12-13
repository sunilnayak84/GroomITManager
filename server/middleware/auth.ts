import { Request, Response, NextFunction } from 'express';
import { getFirebaseAdmin, getUserRole, RoleTypes, DefaultPermissions } from '../firebase';
import admin from 'firebase-admin';

// Define the user type for Express
declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        email: string | null;
        role: keyof typeof RoleTypes;
        permissions: string[];
        displayName: string | null;
      };
    }
  }
}

// User management restricted paths
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
    const firebaseApp = getFirebaseAdmin();
    
    if (!firebaseApp) {
      console.error('Firebase Admin not initialized');
      return res.status(500).json({ 
        message: 'Authentication service unavailable',
        code: 'AUTH_SERVICE_ERROR'
      });
    }

    try {
      const decodedToken = await firebaseApp.auth().verifyIdToken(idToken);
      const user = await firebaseApp.auth().getUser(decodedToken.uid);
      
      // Get role and permissions from Realtime Database
      const userRole = await getUserRole(user.uid);
      
      if (!userRole) {
        console.warn(`No role found for user ${user.email}, using default staff role`);
      }
      
      req.user = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        role: userRole?.role || RoleTypes.staff,
        permissions: userRole?.permissions || DefaultPermissions[RoleTypes.staff]
      };
      
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
export function requireRole(allowedRoles: Array<keyof typeof RoleTypes>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    // Admin has access to everything
    if (req.user.role === RoleTypes.admin) {
      return next();
    }

    // For manager role, check restricted paths
    if (req.user.role === RoleTypes.manager && isRestrictedPath(req.path)) {
      return res.status(403).json({
        message: 'Managers cannot access user management features',
        code: 'MANAGER_RESTRICTED'
      });
    }

    // Check if user's role is allowed
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
        code: 'INSUFFICIENT_ROLE',
        requiredRoles: allowedRoles,
        currentRole: req.user.role
      });
    }

    next();
  };
}

// Permission-based access control middleware
export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    // Admin has all permissions
    if (req.user.role === RoleTypes.admin) {
      return next();
    }

    const hasPermission = req.user.permissions?.includes(permission) || 
                         req.user.permissions?.includes('all');
    
    if (!hasPermission) {
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
  if (req.user.role !== RoleTypes.admin) {
    return res.status(403).json({
      message: 'Only administrators can manage users',
      code: 'ADMIN_REQUIRED',
      currentRole: req.user.role
    });
  }

  next();
}

// Manager operation validation middleware
type Permission = string;

export function validateManagerOperation(operation: Permission | Permission[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    // Admin has full access
    if (req.user.role === RoleTypes.admin) {
      return next();
    }

    // Enforce manager role
    if (req.user.role !== RoleTypes.manager) {
      return res.status(403).json({
        message: 'This operation requires manager privileges',
        code: 'MANAGER_REQUIRED',
        requiredRole: RoleTypes.manager,
        currentRole: req.user.role
      });
    }

    // Check required permissions
    const requiredOperations = Array.isArray(operation) ? operation : [operation];
    const missingPermissions = requiredOperations.filter(
      op => !req.user?.permissions.includes(op) && !req.user?.permissions.includes('all')
    );
    
    if (missingPermissions.length > 0) {
      return res.status(403).json({
        message: 'Insufficient permissions for this operation',
        code: 'INSUFFICIENT_MANAGER_PERMISSION',
        requiredOperations,
        missingPermissions,
        userPermissions: req.user.permissions
      });
    }

    next();
  };
}