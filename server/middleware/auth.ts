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

export function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Access denied. Insufficient permissions.',
        requiredRoles: roles,
        currentRole: req.user.role
      });
    }

    next();
  };
}
