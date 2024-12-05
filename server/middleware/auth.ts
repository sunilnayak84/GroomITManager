import { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';

export interface FirebaseUser {
  id: string;
  email: string;
  role: string;
  name: string;
}

declare global {
  namespace Express {
    // Extend the base Request type with our FirebaseUser
    interface Request {
      user?: FirebaseUser;
    }
  }
}

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
