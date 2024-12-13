import { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';

import { FirebaseUser, RolePermissions } from '../auth';

// We don't need to redeclare the namespace as it's already declared in auth.ts

export async function authenticateFirebase(req: Request, res: Response, next: NextFunction) {
  try {
    // Skip authentication for health check
    if (req.path === '/api/health') {
      return next();
    }

    // Development mode handling
    if (process.env.NODE_ENV === 'development') {
      // Use development admin user by default
      req.user = {
        id: 'dev-admin-uid',
        email: 'admin@groomery.in',
        name: 'Development Admin',
        role: 'admin',
        permissions: ['all']
      };

      // Check for role override in headers for testing different roles
      const roleHeader = req.headers['x-test-role'];
      if (roleHeader && ['admin', 'manager', 'staff', 'receptionist'].includes(roleHeader as string)) {
        const role = roleHeader as 'admin' | 'manager' | 'staff' | 'receptionist';
        const permissions = RolePermissions[role] || [];
        req.user = {
          id: `dev-${role}-uid`,
          email: `${role}@groomery.in`,
          name: `Development ${role.charAt(0).toUpperCase() + role.slice(1)}`,
          role,
          permissions
        };
      }

      return next();
    }

    const authHeader = req.headers.authorization;
    
    // Allow requests without auth header in development
    if (!authHeader?.startsWith('Bearer ') && process.env.NODE_ENV === 'development') {
      req.user = {
        id: 'dev-user',
        email: 'dev@example.com',
        name: 'Developer',
        role: 'admin'
      };
      return next();
    }
    
    // Require auth header in production
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ 
        message: 'No token provided',
        env: process.env.NODE_ENV
      });
    }

    if (process.env.NODE_ENV === 'development') {
      // Skip token verification in development
      next();
    } else {
      // Verify token in production
      try {
        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(token);
        
        req.user = {
          id: decodedToken.uid,
          email: decodedToken.email || '',
          name: decodedToken.name || decodedToken.email || '',
          role: decodedToken.role || 'staff'
        };
        
        next();
      } catch (error) {
        console.error('Token verification error:', error);
        return res.status(401).json({ message: 'Invalid token' });
      }
    }
  } catch (error) {
    console.error('Authentication middleware error:', error);
    // Don't expose error details in production
    if (process.env.NODE_ENV === 'development') {
      return res.status(500).json({ message: `Auth error: ${error}` });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export function requireRole(roles: ('admin' | 'staff' | 'receptionist' | 'manager')[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      // Allow admin to access everything
      if (req.user.role === 'admin') {
        return next();
      }

      // Special handling for user management endpoints
      const userManagementPaths = ['/api/users', '/api/setup-admin', '/api/roles', '/api/auth/roles'];
      const isUserManagementEndpoint = userManagementPaths.some(path => req.path.startsWith(path));

      // Block managers from user management endpoints
      if (req.user.role === 'manager') {
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

        // Check if current path matches any restricted paths
        const isRestrictedPath = userManagementPaths.some(path => 
          req.path.toLowerCase().startsWith(path.toLowerCase())
        );

        if (isRestrictedPath) {
          console.log(`[AUTH] Manager access denied to ${req.path}`);
          return res.status(403).json({
            message: 'Access denied. Managers cannot access user management features.',
            code: 'MANAGER_RESTRICTED',
            path: req.path
          });
        }
      }

      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ 
          message: 'Access denied. Insufficient permissions.',
          code: 'INSUFFICIENT_ROLE',
          requiredRoles: roles,
          currentRole: req.user.role
        });
      }

      // Additional manager role restrictions
      if (req.user.role === 'manager') {
        // Import restricted paths from auth.ts
        const MANAGER_RESTRICTED_PATHS = [
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
        
        // Check if the request path starts with any restricted path
        const isUserManagementEndpoint = MANAGER_RESTRICTED_PATHS.some(
          path => req.path.startsWith(path)
        );
        
        // Additional check for any endpoints containing 'user' or 'role' in their path
        const isUserRelatedEndpoint = req.path.toLowerCase().includes('/user') || 
                                    req.path.toLowerCase().includes('/role') ||
                                    req.path.toLowerCase().includes('/auth/admin');

        // Additional checks for role modification operations
        const isRestrictedOperation = 
          (req.path === '/api/me' && req.method === 'PUT' && req.body?.role) ||
          (req.path.includes('/api/staff/role') && ['POST', 'PUT', 'PATCH'].includes(req.method));

        if (isUserManagementEndpoint || isRestrictedOperation || isUserRelatedEndpoint) {
          console.log(`[AUTH] Manager access denied to ${req.path} (${req.method})`);
          return res.status(403).json({
            status: 'error',
            code: 'MANAGER_RESTRICTED',
            message: 'Access denied. Managers cannot manage user roles.',
            details: 'Managers have access to all features except user role management'
          });
        }
      }

      // Staff can access their own branch only
      if (req.user.role === 'staff' && req.params.branchId) {
        if (req.user.branchId?.toString() !== req.params.branchId) {
          return res.status(403).json({
            message: 'Access denied. You can only access your assigned branch.',
            code: 'BRANCH_ACCESS_DENIED'
          });
        }
      }

      next();
    } catch (error) {
      console.error('Role verification error:', error);
      return res.status(500).json({
        message: 'Internal server error during role verification',
        code: 'ROLE_VERIFICATION_ERROR'
      });
    }
  };
}

// Helper middleware for checking specific permissions
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

    if (!req.user.permissions?.includes(permission)) {
      return res.status(403).json({
        message: `Access denied. Missing required permission: ${permission}`,
        code: 'INSUFFICIENT_PERMISSION',
        requiredPermission: permission
      });
    }

    next();
  };
}
