import { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';

import { FirebaseUser } from '../auth';

// We don't need to redeclare the namespace as it's already declared in auth.ts

export async function authenticateFirebase(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);

    // Add user data to the request
    req.user = {
      id: decodedToken.uid,
      email: decodedToken.email || '',
      name: decodedToken.name || decodedToken.email || '',
      role: decodedToken.role || 'staff'
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ message: 'Invalid token' });
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
