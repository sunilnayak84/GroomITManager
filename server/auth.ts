import { type Express } from "express";
import admin from "firebase-admin";
import { users } from "@db/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";

// Initialize Firebase Admin - simplified to use the instance from server/index.ts
function getFirebaseAdmin() {
  if (!admin.apps.length) {
    throw new Error('Firebase Admin not initialized. Initialize in server/index.ts first.');
  }
  return admin.app();
}

// Type for our Firebase auth user
export interface FirebaseUser {
  id: string;
  email: string;
  role: 'admin' | 'manager' | 'staff' | 'receptionist';
  name: string;
  branchId?: number;
  permissions?: string[];
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
      const userData = {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: '', // Required field
        role: (user.role === 'admin' || user.role === 'staff' || user.role === 'manager') ? user.role : 'staff' as const,
        isGroomer: user.role === 'groomer',
        isActive: true
      };
      await db.insert(users).values(userData);

      if (process.env.NODE_ENV !== 'development' && firebaseAdmin) {
        await admin.auth().setCustomUserClaims(user.id, {
          role: user.role
        });
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error creating user in database:', error);
    return false;
  }
}
export async function setUserRole(userId: string, role: 'admin' | 'staff' | 'receptionist' | 'manager') {
  try {
    console.log(`Setting role ${role} for user ${userId}`);

    // For development mode or testing
    if (process.env.NODE_ENV === 'development') {
      console.log(`Development mode - Role ${role} set for user ${userId}`);
      return true;
    }

    // Get Firebase Admin instance
    const app = getFirebaseAdmin();
    
    // Get current user from Firebase
    const userRecord = await admin.auth().getUser(userId);
    if (!userRecord) {
      throw new Error('User not found in Firebase');
    }

    // Define role-specific permissions
    const permissions = {
      admin: ['all'],
      manager: [
        'manage_appointments',
        'manage_services',
        'manage_inventory',
        'view_reports',
        'manage_staff_schedules',
        'manage_customers',
        'view_analytics',
        'manage_service_packages',
        'manage_notifications'
      ],
      staff: [
        'manage_appointments',
        'view_customers',
        'view_inventory',
        'manage_own_schedule'
      ],
      receptionist: [
        'view_appointments',
        'create_appointments',
        'view_customers',
        'create_customers'
      ]
    }[role] || ['view_appointments'];

    // Set custom claims including role, permissions and timestamp
    const claims = {
      role,
      permissions,
      updatedAt: new Date().toISOString()
    };

    await admin.auth().setCustomUserClaims(userId, claims);

    console.log(`Successfully set role ${role} for user ${userId} (${userRecord.email})`);
    console.log('Assigned permissions:', permissions);
    
    return true;
  } catch (error) {
    console.error('Error setting user role:', error);
    throw error instanceof Error 
      ? new Error(`Failed to set user role: ${error.message}`)
      : new Error('Failed to set user role: Unknown error');
  }
}


export function setupAuth(app: Express) {
  try {
    // Always initialize Firebase in development mode for testing
    if (process.env.NODE_ENV === 'development') {
      console.log('Running in development mode - initializing Firebase for testing');
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID || 'test',
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL || 'test@example.com',
            privateKey: (process.env.FIREBASE_PRIVATE_KEY || 'test-key').replace(/\\n/g, '\n')
          } as admin.ServiceAccount)
        });
      }
    }

    // Initialize Firebase Admin
    const firebaseApp = initializeFirebaseAdmin();
    if (!firebaseApp) {
      console.warn('Firebase Admin initialization failed, falling back to development mode');
      app.use((req, res, next) => {
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
          role: (existingUser?.role || 'staff') as 'admin' | 'manager' | 'staff'
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