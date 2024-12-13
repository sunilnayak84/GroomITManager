import { Request, Response, NextFunction } from 'express';
import { RolePermissions } from '../auth';

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
export function authenticateFirebase(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ 
      message: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }
  next();
}

// Role-based access control middleware
export function requireRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    // Admin has access to everything
    if (req.user.role === 'admin') {
      return next();
    }

    // For manager role, check restricted paths
    if (req.user.role === 'manager' && isRestrictedPath(req.path)) {
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
        requiredRoles: allowedRoles
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

    if (req.user.role === 'admin') {
      return next(); // Admin has all permissions
    }

    const rolePermissions = RolePermissions[req.user.role];
    if (!rolePermissions?.includes(permission) && !rolePermissions?.includes('all')) {
      return res.status(403).json({
        message: `Access denied. Missing required permission: ${permission}`,
        code: 'INSUFFICIENT_PERMISSION',
        requiredPermission: permission
      });
    }

    next();
  };
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