import { type Express } from "express";
import admin from "firebase-admin";
import { users } from "@db/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";

// Initialize Firebase Admin
let firebaseAdmin: admin.app.App | undefined;

function initializeFirebaseAdmin() {
  if (!firebaseAdmin) {
    try {
      // Check for required environment variables
      const requiredEnvVars = [
        'FIREBASE_PROJECT_ID',
        'FIREBASE_CLIENT_EMAIL',
        'FIREBASE_PRIVATE_KEY',
        'FIREBASE_STORAGE_BUCKET'
      ];

      const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
      if (missingEnvVars.length > 0) {
        console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
        throw new Error('Firebase configuration is incomplete');
      }

      // Prepare service account with proper error handling
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
      if (!privateKey) {
        throw new Error('Invalid FIREBASE_PRIVATE_KEY format');
      }

      const serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      };

      // Initialize Firebase Admin SDK
      firebaseAdmin = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET
      });

      console.log('Firebase Admin SDK initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Firebase Admin:', error);
      // Don't throw here, just log the error and return undefined
      return undefined;
    }
  }
  return firebaseAdmin;
}

// Type for our Firebase auth user
export interface FirebaseUser {
  id: string;
  email: string;
  role: 'admin' | 'staff';
  name: string;
  branchId?: number;
}

// Extend Express Request type to avoid recursive type reference
declare global {
  namespace Express {
    interface Request {
      user?: FirebaseUser;
    }
  }
}

// Export the type for use in other files
export type AuthUser = FirebaseUser;

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

      // Create user custom claims in Firebase
      await admin.auth().setCustomUserClaims(user.id, {
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
  try {
    // Skip Firebase setup in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log('Running in development mode - skipping authentication');
      app.use((req, res, next) => {
        // Set a default development user
        req.user = {
          id: 'dev-user',
          email: 'dev@example.com',
          role: 'admin',
          name: 'Developer'
        };
        next();
      });
      return;
    }

    // Initialize Firebase Admin
    const firebaseApp = initializeFirebaseAdmin();
    if (!firebaseApp) {
      console.warn('Firebase Admin initialization failed, falling back to development mode');
      app.use((req, res, next) => next());
      return;
    }

    // Add authentication middleware
    app.use(async (req, res, next) => {
      // Skip authentication for health check
      if (req.path === '/api/health') {
        return next();
      }

      try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
          return res.status(401).json({ message: "Not authenticated" });
        }

        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(token);
        
        // Get user from database or create if doesn't exist
        const [existingUser] = await db
          .select()
          .from(users)
          .where(eq(users.id, decodedToken.uid))
          .limit(1);

        if (!existingUser) {
          // Create user in database
          await createUserInDatabase({
            id: decodedToken.uid,
            email: decodedToken.email || '',
            name: decodedToken.name || decodedToken.email || '',
            role: 'staff'
          });
        }

        req.user = {
          id: decodedToken.uid,
          email: decodedToken.email || '',
          name: decodedToken.name || decodedToken.email || '',
          role: existingUser?.role || 'staff'
        };

        next();
      } catch (error) {
        console.error('Auth error:', error);
        return res.status(401).json({ message: "Authentication failed" });
      }
    });

    // Simple auth check endpoint
    app.get("/api/user", (req, res) => {
      if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      res.json(req.user);
    });

    console.log('Auth middleware setup completed');
  } catch (error) {
    console.error('Failed to setup auth:', error);
    throw error;
  }
}