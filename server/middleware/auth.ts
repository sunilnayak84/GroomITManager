import { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';

import { FirebaseUser } from '../auth';

// We don't need to redeclare the namespace as it's already declared in auth.ts

export async function authenticateFirebase(req: Request, res: Response, next: NextFunction) {
  try {
    // Skip authentication for development mode or health check
    if (process.env.NODE_ENV === 'development' || req.path === '/api/health') {
      req.user = {
        id: 'dev-user',
        email: 'dev@example.com',
        name: 'Developer',
        role: 'admin',
        branchId: 1
      };
      return next();
    }

    // Also skip auth for development environment with auth header
    if (process.env.NODE_ENV === 'development' && req.headers.authorization) {
      req.user = {
        id: 'dev-user',
        email: 'dev@example.com',
        name: 'Developer',
        role: 'admin',
        branchId: 1
      };
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

export function requireRole(roles: ('admin' | 'staff' | 'receptionist')[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    if (!roles.includes(req.user.role as any)) {
      return res.status(403).json({ 
        message: 'Access denied. Insufficient permissions.',
        code: 'INSUFFICIENT_ROLE',
        requiredRoles: roles,
        currentRole: req.user.role
      });
    }

    // Allow admin to access everything
    if (req.user.role === 'admin') {
      return next();
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
