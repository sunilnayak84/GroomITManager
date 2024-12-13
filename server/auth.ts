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

// Define role permissions
export const RolePermissions: Record<string, string[]> = {
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
    'manage_notifications',
    'manage_working_hours',
    'view_all_branches',
    'manage_pets',
    'manage_consumables',
    'view_staff',
    'manage_branch_settings',
    'manage_service_pricing',
    'view_financial_reports',
    'manage_marketing_campaigns',
    'manage_inventory',
    'manage_services',
    'manage_appointments',
    'manage_working_hours',
    'view_dashboard',
    'manage_staff_schedule',
    'manage_branch_operations'
  ],
  staff: [
    'manage_appointments',
    'view_customers',
    'view_inventory',
    'manage_own_schedule',
    'view_pets'
  ],
  receptionist: [
    'view_appointments',
    'create_appointments',
    'view_customers',
    'create_customers',
    'view_pets'
  ]
};

// Define restricted endpoints for manager role - anything related to user management
export const MANAGER_RESTRICTED_ENDPOINTS = [
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
        role: (user.role === 'admin' || user.role === 'manager' || user.role === 'staff' || user.role === 'receptionist') 
        ? user.role 
        : 'staff' as const,
        isActive: true
      };
      await db.insert(users).values(userData);

      if (process.env.NODE_ENV !== 'development') {
        const app = getFirebaseAdmin();
        await admin.auth().setCustomUserClaims(user.id, {
          role: user.role,
          permissions: RolePermissions[user.role] || []
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
    console.log(`[AUTH] Setting role ${role} for user ${userId}`);

    // For development mode or testing
    if (process.env.NODE_ENV === 'development') {
      console.log(`[AUTH] Development mode - Role ${role} set for user ${userId}`);
      return true;
    }

    // Get Firebase Admin instance
    const app = getFirebaseAdmin();
    
    // Get current user from Firebase
    const userRecord = await admin.auth().getUser(userId);
    if (!userRecord) {
      throw new Error('User not found in Firebase');
    }

    // Get current claims
    const currentClaims = (await admin.auth().getUser(userId)).customClaims || {};

    // Role transition validation
    if (currentClaims.role === 'admin') {
      if (role !== 'admin') {
        throw new Error('Cannot downgrade admin user');
      }
    }

    // Special validation for manager role
    if (role === 'manager') {
      // Validate email domain or any other business rules
      const email = userRecord.email?.toLowerCase() || '';
      if (!email.endsWith('@groomery.in') && process.env.NODE_ENV !== 'development') {
        throw new Error('Manager role requires a company email address');
      }
      
      // Ensure manager can't modify admin users
      if (currentClaims.role === 'admin') {
        throw new Error('Cannot modify admin user roles');
      }
    }

    // Get permissions from RolePermissions constant
    const permissions = RolePermissions[role];
    if (!permissions) {
      throw new Error(`Invalid role: ${role}`);
    }

    // Set custom claims including role, permissions and timestamp
    const claims = {
      role,
      permissions,
      updatedAt: new Date().toISOString()
    };

    await admin.auth().setCustomUserClaims(userId, claims);

    console.log(`[AUTH] Successfully set role ${role} for user ${userId} (${userRecord.email})`);
    console.log('[AUTH] Assigned permissions:', permissions);
    
    // Update user in database if needed
    await db.update(users)
      .set({ role })
      .where(eq(users.id, userId));
    
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
          role: (existingUser?.role || 'staff') as 'admin' | 'manager' | 'staff' | 'receptionist'
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