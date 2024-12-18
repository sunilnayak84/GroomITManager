import { type Express } from "express";
import * as admin from "firebase-admin";
import { 
  initializeFirebaseAdmin,
  RoleTypes,
  DefaultPermissions,
  Permission,
  getFirebaseAdmin
} from "./firebase";
import { getAuth } from "firebase-admin/auth";
import { getDatabase } from "firebase-admin/database";

// Type for our Firebase auth user
export interface FirebaseUser {
  id: string;
  uid: string;
  email: string | null;
  role: keyof typeof RoleTypes;
  name: string;
  displayName: string;
  permissions: string[];
}

// Type guard for FirebaseUser
export function isFirebaseUser(user: any): user is FirebaseUser {
  return (
    user &&
    typeof user.id === 'string' &&
    typeof user.uid === 'string' &&
    (typeof user.email === 'string' || user.email === null) &&
    typeof user.name === 'string' &&
    typeof user.displayName === 'string' &&
    Array.isArray(user.permissions)
  );
}

// Type for database user
interface DatabaseUser {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: keyof typeof RoleTypes;
  isActive: boolean;
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: FirebaseUser;
      firebaseUser?: admin.auth.UserRecord;
    }
  }
}

// Define role permissions
export const RolePermissions: Record<string, string[]> = {
  admin: ['all'],
  manager: [
    // Appointment Management
    'manage_appointments',
    'view_all_appointments',
    'reschedule_appointments',
    'cancel_appointments',
    'create_appointments',
    
    // Service Management
    'manage_services',
    'create_services',
    'edit_services',
    'view_services',
    'set_service_pricing',
    
    // Staff Schedule Management (excluding user/role management)
    'view_staff_schedule',
    'manage_staff_schedule',
    'assign_staff_tasks',
    'manage_working_hours',
    
    // Customer and Pet Management
    'manage_customers',
    'view_customers',
    'edit_customer_info',
    'manage_pets',
    'view_all_pets',
    'edit_pet_info',
    
    // Inventory and Stock Management
    'manage_inventory',
    'view_inventory',
    'update_stock',
    'manage_consumables',
    'view_stock_alerts',
    'create_purchase_orders',
    
    // Business Operations
    'view_analytics',
    'view_reports',
    'manage_branch_settings',
    'view_financial_reports',
    'export_reports',
    
    // Service Package Management
    'manage_service_packages',
    'create_packages',
    'edit_packages',
    'set_package_pricing',
    
    // Branch Operations
    'view_branch_details',
    'manage_branch_operations',
    'view_branch_performance',
    
    // Customer Communication
    'manage_notifications',
    'send_customer_notifications',
    'manage_customer_feedback',
    
    // Marketing and Promotions
    'manage_marketing_campaigns',
    'create_promotions',
    'edit_promotions',
    'view_campaign_analytics',
    
    // Financial Operations
    'manage_service_pricing',
    'set_special_rates',
    'view_revenue_reports',
    'manage_discounts'
  ],
  staff: ['all'],  // Temporary solution: giving staff full admin permissions
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
    const db = admin.database();
    const userRef = db.ref(`users/${user.id}`);
    
    // Check if user exists
    const snapshot = await userRef.once('value');
    if (!snapshot.exists()) {
      // Default to user role for new users
      const defaultRole = 'user';
      
      const userData = {
        id: user.id,
        email: user.email || '',
        name: user.name,
        displayName: user.displayName,
        role: defaultRole,
        permissions: DefaultPermissions[defaultRole],
        isActive: true,
        createdAt: Date.now(),
        lastUpdated: Date.now()
      };

      // Set user data in users collection
      await userRef.set(userData);
      console.log('[AUTH] Created new user in Firebase:', userData);

      // Set role in roles collection
      await db.ref(`roles/${user.id}`).set({
        role: defaultRole,
        permissions: DefaultPermissions[defaultRole],
        updatedAt: Date.now()
      });

      // Set custom claims
      const app = await initializeFirebaseAdmin();
      await admin.auth().setCustomUserClaims(user.id, {
        role: defaultRole,
        permissions: DefaultPermissions[defaultRole],
        updatedAt: Date.now()
      });

      console.log('[AUTH] Assigned default role and permissions for new user:', {
        userId: user.id,
        role: defaultRole,
        permissions: DefaultPermissions[defaultRole]
      });
    }
    
    return true;
  } catch (error) {
    console.error('[AUTH] Error creating user in database:', error);
    return false;
  }
}
export async function setUserRole(userId: string, role: keyof typeof RoleTypes) {
  try {
    console.log(`[AUTH] Setting role ${role} for user ${userId}`);

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

    // Special handling for admin role
    if (role === 'admin') {
      const email = userRecord.email?.toLowerCase() || '';
      // In development mode, allow any email for admin
      if (process.env.NODE_ENV !== 'development' && !email.endsWith('@groomery.in')) {
        throw new Error('Admin role requires a company email address');
      }
    }

    // Get permissions from RolePermissions constant
    const permissions = RolePermissions[role];
    if (!permissions) {
      throw new Error(`Invalid role: ${role}`);
    }

    // Set custom claims including role, permissions and timestamp
    const customClaims = {
      role,
      permissions,
      updatedAt: new Date().toISOString()
    };
    
    await admin.auth().setCustomUserClaims(userId, customClaims);

    // Force a token refresh
    await admin.auth().revokeRefreshTokens(userId);

    // Double check the claims were set
    const updatedUser = await admin.auth().getUser(userId);
    if (!updatedUser.customClaims || updatedUser.customClaims.role !== role) {
      throw new Error('Failed to verify role update');
    }

    console.log(`[AUTH] Successfully set role ${role} for user ${userId} (${userRecord.email})`);
    console.log('[AUTH] Assigned permissions:', permissions);
    console.log('[AUTH] Custom claims set:', customClaims);
    console.log('[AUTH] Tokens revoked, user will need to re-authenticate');
    
    // Update user role in Firebase Realtime Database
    const db = admin.database();
    await db.ref(`users/${userId}`).update({ role });
    
    return true;
  } catch (error) {
    console.error('Error setting user role:', error);
    throw error instanceof Error 
      ? new Error(`Failed to set user role: ${error.message}`)
      : new Error('Failed to set user role: Unknown error');
  }
}

async function setupDevelopmentAdmin() {
  try {
    const auth = admin.auth();
    const adminEmail = 'admin@groomery.in';
    const adminUid = 'MjQnuZnthzUIh2huoDpqCSMMvxe2';
    
    // Try to get admin user or create if doesn't exist
    try {
      await auth.getUser(adminUid);
      console.log('[AUTH] Found existing admin user');
    } catch (error) {
      // Create admin user if not found
      await auth.createUser({
        uid: adminUid,
        email: adminEmail,
        emailVerified: true,
        displayName: 'Admin User',
        password: 'admin123'
      });
      console.log('[AUTH] Created new admin user');
    }

    // Set admin role in Realtime Database
    const db = admin.database();
    const userRolesRef = db.ref(`roles/${adminUid}`);
    
    await userRolesRef.set({
      role: 'admin',
      permissions: ['all'],
      updatedAt: Date.now(),
      isAdmin: true
    });

    // Set admin custom claims
    await auth.setCustomUserClaims(adminUid, {
      role: 'admin',
      permissions: ['all'],
      isAdmin: true,
      updatedAt: Date.now()
    });

    // Log role update in history
    await db.ref(`role-history/${adminUid}`).push({
      action: 'development_setup',
      role: 'admin',
      permissions: ['all'],
      timestamp: Date.now(),
      type: 'initial_setup'
    });

    console.log('[AUTH] Development admin user set up successfully');
  } catch (error) {
    console.error('[AUTH] Error setting up development admin:', error);
  }
}

// Health check interval in milliseconds
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds

export async function setupAuth(app: Express) {
  const isDevelopment = process.env.NODE_ENV === 'development';
  console.log(`[AUTH] Setting up authentication middleware in ${isDevelopment ? 'development' : 'production'} mode`);

  // Setup connection health monitoring
  let isHealthy = true;
  const checkConnectionHealth = async () => {
    try {
      const auth = admin.auth();
      await auth.listUsers(1); // Light query to check connection
      if (!isHealthy) {
        console.log('[AUTH] Connection restored');
        isHealthy = true;
      }
    } catch (error) {
      if (isHealthy) {
        console.error('[AUTH] Connection health check failed:', error);
        isHealthy = false;
      }
    }
  };

  // Start health monitoring
  setInterval(checkConnectionHealth, HEALTH_CHECK_INTERVAL);

  try {
    // Initialize Firebase Admin
    await initializeFirebaseAdmin();
    console.log('[AUTH] Firebase Admin initialized successfully');

    // Add authentication middleware
    app.use(async (req, res, next) => {
      // Skip authentication for health check and options requests
      if (req.path === '/api/health' || req.method === 'OPTIONS') {
        return next();
      }

      try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
          return res.status(401).json({ 
            message: "Not authenticated",
            code: "NO_TOKEN" 
          });
        }

        // In development mode, allow test token
        if (isDevelopment && authHeader === 'Bearer test-token') {
          const devUser: FirebaseUser = {
            id: 'MjQnuZnthzUIh2huoDpqCSMMvxe2',
            uid: 'MjQnuZnthzUIh2huoDpqCSMMvxe2',
            email: 'admin@groomery.in',
            name: 'Admin User',
            role: 'admin',
            permissions: ['all'],
            displayName: 'Admin User'
          };
          req.user = devUser;
          return next();
        }

        const token = authHeader.split('Bearer ')[1];
        const auth = admin.auth();
        const decodedToken = await auth.verifyIdToken(token);
        
        // Get role and permissions from Firebase Realtime Database
        const db = admin.database();
        const userRoleSnapshot = await db.ref(`roles/${decodedToken.uid}`).once('value');
        const userRole = userRoleSnapshot.val() || { role: RoleTypes.customer, permissions: DefaultPermissions[RoleTypes.customer] };

        // Get user from Firebase database or create if doesn't exist
        const dbRef = admin.database();
        const userRef = dbRef.ref(`users/${decodedToken.uid}`);
        const snapshot = await userRef.once('value');
        const existingUser = snapshot.val();

        if (!existingUser) {
          const newUser = {
            id: decodedToken.uid,
            email: decodedToken.email || '',
            name: decodedToken.displayName || decodedToken.email || '',
            displayName: decodedToken.displayName || decodedToken.email?.split('@')[0] || 'Unknown User',
            role: userRole.role as keyof typeof RoleTypes,
            permissions: userRole.permissions || [],
            createdAt: Date.now(),
            lastUpdated: Date.now()
          };
          await userRef.set(newUser);
          console.log('[AUTH] Created new user in Firebase:', newUser);
        }

        req.user = {
          id: decodedToken.uid,
          uid: decodedToken.uid,
          email: decodedToken.email || '',
          name: decodedToken.displayName || decodedToken.email || '',
          displayName: decodedToken.displayName || decodedToken.email?.split('@')[0] || 'Unknown User',
          role: userRole.role as keyof typeof RoleTypes,
          permissions: userRole.permissions || []
        };

        next();
      } catch (error) {
        console.error('[AUTH] Authentication error:', error);
        
        if (error instanceof Error) {
          return res.status(401).json({ 
            message: "Authentication failed",
            error: error.message,
            code: "AUTH_ERROR"
          });
        }
        
        return res.status(401).json({ 
          message: "Authentication failed",
          code: "UNKNOWN_ERROR"
        });
      }
    });

    // Simple auth check endpoint
    app.get("/api/user", (req, res) => {
      if (!req.user) {
        return res.status(401).json({ 
          message: "Not authenticated",
          code: "NO_USER" 
        });
      }
      res.json(req.user);
    });

    console.log('[AUTH] Authentication middleware setup completed');
    
    // In development mode, ensure admin user exists
    if (isDevelopment) {
      await setupDevelopmentAdmin();
    }
  } catch (error) {
    console.error('[AUTH] Failed to setup authentication:', error);
    if (isDevelopment) {
      console.warn('[AUTH] Continuing in development mode despite setup error');
    } else {
      throw error;
    }
  }
}