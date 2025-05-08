import { type Express } from "express";
import * as admin from "firebase-admin";
import {
  RoleTypes,
  DefaultPermissions,
  Permission,
  getFirebaseAdmin,
  initializeFirebaseAdmin
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
    const db = getDatabase();
    const userRef = db.ref(`users/${user.id}`);

    // Check if user exists
    const snapshot = await userRef.once('value');
    if (!snapshot.exists()) {
      const userData = {
        id: user.id,
        email: user.email || '',
        name: user.name,
        displayName: user.displayName,
        role: (user.role === 'admin' || user.role === 'manager' || user.role === 'staff' || user.role === 'receptionist')
          ? user.role
          : 'staff' as const,
        permissions: user.permissions || RolePermissions[user.role] || [],
        isActive: true,
        createdAt: Date.now(),
        lastUpdated: Date.now()
      };

      await userRef.set(userData);
      console.log('[AUTH] Created new user in Firebase:', userData);

      if (process.env.NODE_ENV !== 'development') {
        const app = await initializeFirebaseAdmin();
        await admin.auth().setCustomUserClaims(user.id, {
          role: user.role,
          permissions: RolePermissions[user.role] || []
        });
      }
    }

    return true;
  } catch (error) {
    console.error('[AUTH] Error creating user in database:', error);
    return false;
  }
}

function validateRoleUpdate(currentRole: RoleTypes, newRole: RoleTypes, actorRole: RoleTypes | null): { valid: boolean; error?: string } {
  if (currentRole === RoleTypes.admin && newRole !== RoleTypes.admin) {
    return { valid: false, error: 'Cannot downgrade admin user' };
  }
  if (actorRole === RoleTypes.manager && currentRole === RoleTypes.admin) {
    return { valid: false, error: 'Managers cannot modify admin users' };
  }
  if (actorRole === RoleTypes.staff && currentRole === RoleTypes.admin) {
      return { valid: false, error: 'Staff cannot modify admin users' };
  }
  return { valid: true };
}

export async function setUserRole(userId: string, role: RoleTypes, actorId: string) {
  try {
    console.log(`[AUTH] Setting role ${role} for user ${userId}`);

    // Get Firebase Admin instance
    const app = getFirebaseAdmin();

    // Get current user records
    const userRecord = await admin.auth().getUser(userId);
    const actorRecord = await admin.auth().getUser(actorId);

    if (!userRecord || !actorRecord) {
      throw new Error('User not found');
    }

    // Get current roles
    const db = getDatabase();
    const roleSnapshot = await db.ref(`roles/${userId}`).once('value');
    const currentRole = roleSnapshot.val()?.role || RoleTypes.staff;

    const actorRoleSnapshot = await db.ref(`roles/${actorId}`).once('value');
    const actorRole = actorRoleSnapshot.val()?.role;

    // Validate role update
    const validation = validateRoleUpdate(currentRole, role, actorRole);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Validate email domain for sensitive roles
    if (role === RoleTypes.admin || role === RoleTypes.manager) {
      const email = userRecord.email?.toLowerCase() || '';
      if (!email.endsWith('@groomery.in') && process.env.NODE_ENV !== 'development') {
        throw new Error(`${role} role requires a company email address`);
      }
    }

    // Get permissions for the new role
    const permissions = DefaultPermissions[role];
    const timestamp = new Date().toISOString();

    // Update custom claims
    const customClaims = {
      role,
      permissions,
      updatedAt: timestamp,
      updatedBy: actorId
    };

    await admin.auth().setCustomUserClaims(userId, customClaims);

    // Force token refresh
    await admin.auth().revokeRefreshTokens(userId);

    // Update role in Realtime Database
    await db.ref(`roles/${userId}`).set({
      role,
      permissions,
      updatedAt: timestamp,
      updatedBy: actorId
    });

    // Create role history entry
    await db.ref(`role-history/${userId}`).push({
      previousRole: currentRole,
      newRole: role,
      timestamp,
      actorId,
      actorEmail: actorRecord.email,
      type: 'role_update'
    });

    // Update user record in Users collection
    await db.ref(`users/${userId}`).update({
      role,
      permissions,
      lastRoleUpdate: timestamp
    });

    console.log(`[AUTH] Successfully set role ${role} for user ${userId}`);

    return {
      success: true,
      user: userRecord,
      role,
      permissions
    };

  } catch (error) {
    console.error('[AUTH] Error setting user role:', error);
    throw error instanceof Error
      ? new Error(`Failed to set user role: ${error.message}`)
      : new Error('Failed to set user role: Unknown error');
  }
}

// Add a function to get role history
export async function getRoleHistory(userId: string) {
  try {
    const db = getDatabase();
    const historySnapshot = await db.ref(`role-history/${userId}`).orderByChild('timestamp').once('value');
    return historySnapshot.val() || [];
  } catch (error) {
    console.error('[AUTH] Error getting role history:', error);
    throw error;
  }
}

// Add a function to validate user permissions
export function hasPermission(userPermissions: string[], requiredPermission: Permission): boolean {
  return userPermissions.includes('all') || userPermissions.includes(requiredPermission);
}

async function setupDevelopmentAdmin() {
  try {
    const auth = getAuth();
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
    const db = getDatabase();
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

// Health check configuration
const HEALTH_CHECK_INTERVAL = 60000; // 60 seconds (increased to reduce frequency)
const MAX_RETRIES = 5; // Increased retry count
let retryCount = 0;
let lastHealthCheckTime = 0;
const MIN_CHECK_INTERVAL = 15000; // Increased to 15 seconds between checks
let consecutiveFailures = 0;
const MAX_CONSECUTIVE_FAILURES = 10;
let isInitializing = false;

export async function setupAuth(app: Express) {
  const isDevelopment = process.env.NODE_ENV === 'development';
  console.log(`[AUTH] Setting up authentication middleware in ${isDevelopment ? 'development' : 'production'} mode`);

  // Setup connection health monitoring
  let isHealthy = true;
  const checkConnectionHealth = async () => {
    // Skip if another initialization is in progress
    if (isInitializing) {
      console.log('[AUTH] Skipping health check - initialization in progress');
      return;
    }

    const now = Date.now();
    if (now - lastHealthCheckTime < MIN_CHECK_INTERVAL) {
      return; // Prevent too frequent checks
    }
    lastHealthCheckTime = now;

    try {
      // In development mode, we can be more lenient with checks
      if (isDevelopment) {
        // Only do a real check occasionally in dev mode
        if (Math.random() > 0.3) {
          return;
        }
      }

      const auth = getAuth();
      await auth.listUsers(1); // Light query to check connection
      
      if (!isHealthy) {
        console.log('[AUTH] Connection restored');
        isHealthy = true;
        retryCount = 0; // Reset retry count on successful connection
        consecutiveFailures = 0;
      }
    } catch (error) {
      consecutiveFailures++;
      const errorCode = (error as any).code;
      
      // Only log the first failure or periodic failures to avoid log spam
      if (isHealthy || consecutiveFailures % 5 === 0) {
        console.error(`[AUTH] Connection health check failed (failure #${consecutiveFailures}):`, 
          error instanceof Error ? error.message : error);
        isHealthy = false;
      }

      // Handle credential errors specifically
      if ((errorCode === 'app/invalid-credential' || 
           errorCode === 'auth/invalid-credential' ||
           errorCode === 'app/unauthorized-app') && 
          retryCount < MAX_RETRIES) {
        
        retryCount++;
        console.log(`[AUTH] Attempting to reinitialize Firebase Admin (Attempt ${retryCount}/${MAX_RETRIES})`);
        
        try {
          isInitializing = true;
          // Delete existing apps first
          for (const app of admin.apps) {
            if (app) {
              try {
                await app.delete().catch(() => {});
              } catch (e) {
                // Ignore errors during deletion
              }
            }
          }
          
          await initializeFirebaseAdmin();
          console.log('[AUTH] Successfully reinitialized Firebase Admin');
          isHealthy = true; // Mark as healthy if reinitialization succeeds
          consecutiveFailures = 0;
        } catch (reinitError) {
          console.error('[AUTH] Failed to reinitialize Firebase Admin:', 
            reinitError instanceof Error ? reinitError.message : reinitError);
            
          if (isDevelopment) {
            console.warn('[AUTH] Development mode: Continuing with limited functionality');
            isHealthy = true; // Force healthy in development
          }
        } finally {
          isInitializing = false;
        }
      }
      
      // If we've had too many consecutive failures, force health in development
      if (isDevelopment && consecutiveFailures > MAX_CONSECUTIVE_FAILURES) {
        console.warn(`[AUTH] Too many consecutive failures (${consecutiveFailures}). Forcing healthy state in development mode.`);
        isHealthy = true;
        consecutiveFailures = 0;
      }
    }
  };

  // Start health monitoring with a delayed initial check
  setTimeout(() => {
    setInterval(checkConnectionHealth, HEALTH_CHECK_INTERVAL);
  }, 10000); // Increased initial delay to 10 seconds

  try {
    // Initialize Firebase Admin
    await initializeFirebaseAdmin();
    console.log('[AUTH] Firebase Admin initialized successfully');

    // Add authentication middleware
    app.use(async (req, res, next) => {
      // Skip authentication for health check, options requests, and public API endpoints
      if (req.path === '/api/health' || 
          req.path === '/api/status' || 
          req.method === 'OPTIONS' ||
          req.path.startsWith('/api/public/')) {
        return next();
      }

      try {
        const authHeader = req.headers.authorization;
        
        // In development mode, missing auth header can use a default test user
        if (!authHeader?.startsWith('Bearer ')) {
          if (isDevelopment) {
            console.log('[AUTH] No auth token in development mode, using test admin user');
            const devUser: FirebaseUser = {
              id: 'dev-admin-user',
              uid: 'dev-admin-user',
              email: 'admin@example.com',
              name: 'Dev Admin',
              role: 'admin',
              permissions: ['all'],
              displayName: 'Dev Admin'
            };
            req.user = devUser;
            return next();
          }
          
          return res.status(401).json({
            message: "Not authenticated",
            code: "NO_TOKEN"
          });
        }

        // In development mode, allow test token
        if (isDevelopment && 
            (authHeader === 'Bearer test-token' || 
             authHeader === 'Bearer dev-token' ||
             authHeader === 'Bearer admin-token')) {
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
        
        // Handle token verification with retry logic
        let decodedToken;
        try {
          const auth = getAuth();
          decodedToken = await auth.verifyIdToken(token);
        } catch (tokenError) {
          console.error('[AUTH] Token verification failed:', tokenError instanceof Error ? tokenError.message : tokenError);
          
          // In development mode, we can allow bypassing token verification errors
          if (isDevelopment) {
            console.warn('[AUTH] Development mode: Using default admin user due to token verification failure');
            const devUser: FirebaseUser = {
              id: 'dev-token-error-user',
              uid: 'dev-token-error-user',
              email: 'admin@example.com',
              name: 'Dev Admin',
              role: 'admin',
              permissions: ['all'],
              displayName: 'Dev Admin (Token Error)'
            };
            req.user = devUser;
            return next();
          }
          
          return res.status(401).json({
            message: "Invalid authentication token",
            error: tokenError instanceof Error ? tokenError.message : "Token verification failed",
            code: "INVALID_TOKEN"
          });
        }

        // Get role and permissions with error handling
        let userRole = { role: 'staff', permissions: [] };
        try {
          const db = getDatabase();
          const userRoleSnapshot = await db.ref(`roles/${decodedToken.uid}`).once('value');
          userRole = userRoleSnapshot.val() || userRole;
        } catch (roleError) {
          console.error('[AUTH] Error fetching user role:', roleError instanceof Error ? roleError.message : roleError);
          // Continue with default role
        }

        // Create or get user with error handling
        let existingUser = null;
        try {
          const db = getDatabase();
          const userRef = db.ref(`users/${decodedToken.uid}`);
          const snapshot = await userRef.once('value');
          existingUser = snapshot.val();
          
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
            
            try {
              await userRef.set(newUser);
              console.log('[AUTH] Created new user in Firebase:', newUser);
            } catch (createError) {
              console.error('[AUTH] Failed to create user in database:', 
                createError instanceof Error ? createError.message : createError);
              // Continue without creating user
            }
          }
        } catch (userError) {
          console.error('[AUTH] Error fetching/creating user:', 
            userError instanceof Error ? userError.message : userError);
          // Continue with token data only
        }

        // Set user on request
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
        console.error('[AUTH] Authentication error:', error instanceof Error ? error.message : error);

        // In development mode, we can allow requests to proceed with a default user
        if (isDevelopment) {
          console.warn('[AUTH] Development mode: Using default admin user due to authentication error');
          const devUser: FirebaseUser = {
            id: 'dev-error-user',
            uid: 'dev-error-user',
            email: 'admin@example.com',
            name: 'Dev Admin',
            role: 'admin',
            permissions: ['all'],
            displayName: 'Dev Admin (Error)'
          };
          req.user = devUser;
          return next();
        }

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