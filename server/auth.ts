import { type Express } from "express";
import admin from "firebase-admin";
import { users } from "@db/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";

// Type for our Firebase auth user
export interface FirebaseUser {
  id: string;
  email: string;
  role: 'admin' | 'staff';
  name: string;
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: FirebaseUser;
    }
    // Use the correct Firebase user type
    interface User extends FirebaseUser {}
  }
}

export async function createUserInDatabase(user: FirebaseUser) {
  try {
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!existingUser) {
      await db.insert(users).values({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error creating user in database:', error);
    return false;
  }
}

export function setupAuth(app: Express) {
  // Add authentication middleware
  app.use(async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return next();
    }

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
      console.error('Auth error:', error);
      next();
    }
  });

  // Simple auth check endpoint
  app.get("/api/user", (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json(req.user);
  });
}