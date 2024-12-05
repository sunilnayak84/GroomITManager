import { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';

// Define the User type that matches our schema
interface AuthUser {
  id: string;
  email: string;
  role: string;
  name: string;
}

// Extend Express Request to include our user type
declare global {
  namespace Express {
    interface User extends AuthUser {}
  }
}

export async function authenticateFirebase(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized - No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Add the decoded token to the request with proper typing
    req.user = {
      id: decodedToken.uid,
      email: decodedToken.email || '',
      role: decodedToken.role || 'staff',
      name: decodedToken.name || decodedToken.email || ''
    };
    
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ message: 'Unauthorized - Invalid token' });
  }
}
