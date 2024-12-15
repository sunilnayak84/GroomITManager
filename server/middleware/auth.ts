import { Request, Response, NextFunction } from 'express';
import { getFirebaseAdmin, getUserRole, RoleTypes, DefaultPermissions } from '../firebase';
import admin from 'firebase-admin';

// Define custom user interface
interface CustomUser {
  uid: string;
  email: string | null;
  role: keyof typeof RoleTypes;
  permissions: string[];
  displayName: string;
}

// Define the user type for Express
declare global {
  namespace Express {
    interface Request {
      user?: CustomUser;
      firebaseUser?: admin.auth.UserRecord;
    }
  }
}

// Extend FirebaseUser type
interface ExtendedFirebaseUser extends admin.auth.UserRecord {
  role?: keyof typeof RoleTypes;
  permissions?: string[];
}

// User management restricted paths
const userManagementPaths = [
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

// Helper function to check if a path is restricted
const isRestrictedPath = (path: string) => 
  userManagementPaths.some(restrictedPath => path.startsWith(restrictedPath));

// Firebase authentication middleware
export async function authenticateFirebase(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ 
        message: 'No token provided',
        code: 'NO_TOKEN'
      });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const firebaseApp = await getFirebaseAdmin();
    
    if (!firebaseApp) {
      console.error('[AUTH] Firebase Admin not initialized');
      if (process.env.NODE_ENV === 'development') {
        console.log('[AUTH] Development mode: Setting up admin privileges');
        // In development, set admin privileges with all required fields
        const devUser: CustomUser = {
          uid: 'dev-admin',
          email: 'admin@groomery.in',
          displayName: 'Admin User',
          role: 'admin',
          permissions: DefaultPermissions.admin
        };
        req.user = devUser;
        console.log('[AUTH] Development admin account configured:', devUser);
        return next();
      }
      return res.status(500).json({ 
        message: 'Authentication service unavailable',
        code: 'AUTH_SERVICE_ERROR'
      });
    }

    try {
      console.log('[AUTH] Verifying token...');
      const auth = firebaseApp.auth();
      const decodedToken = await auth.verifyIdToken(idToken);
      const user = await auth.getUser(decodedToken.uid);
      
      console.log(`[AUTH] Token verified for user ${user.email}`);
      
      // Get role and permissions
      const userRole = await getUserRole(user.uid);
      console.log('[AUTH] User role data:', userRole);
      
      // Check custom claims and database role
      const customClaims = user.customClaims || {};
      console.log('[AUTH] Custom claims:', customClaims);

      let role: keyof typeof RoleTypes;
      let permissions: string[];

      // Special handling for development admin
      const isDevAdmin = process.env.NODE_ENV === 'development' && user.email === 'admin@groomery.in';
      if (isDevAdmin) {
        console.log('[AUTH] Development admin user detected');
        role = 'admin';
        permissions = DefaultPermissions.admin;
      }
      // Check custom claims
      else if (customClaims.isAdmin === true || customClaims.role === 'admin') {
        console.log('[AUTH] User has admin claims:', customClaims);
        role = 'admin';
        permissions = DefaultPermissions.admin;
      }
      // Check database role
      else if (userRole?.role === 'admin') {
        console.log('[AUTH] User has admin role in database');
        role = 'admin';
        permissions = DefaultPermissions.admin;
      }
      // Use database role if available
      else if (userRole) {
        console.log('[AUTH] User has role from database:', userRole);
        role = userRole.role;
        permissions = userRole.permissions;
      }
      // Default to staff role
      else {
        console.warn(`[AUTH] No role found for user ${user.email}, using default staff role`);
        role = 'staff';
        permissions = DefaultPermissions.staff;
      }

      // For admin users, ensure they have all admin permissions
      if (role === 'admin') {
        permissions = [...new Set([...permissions, ...DefaultPermissions.admin])];
        console.log('[AUTH] Ensured admin has all admin permissions');
      }

      // Additional admin verification for development
      if (role === 'admin') {
        console.log('[AUTH] Verified admin role for user:', user.email);
      }

      // Log final role assignment
      console.log('[AUTH] Final role assignment:', {
        role,
        permissionsCount: permissions.length,
        isAdmin: role === RoleTypes.admin
      });
      
      const userObj: CustomUser = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || user.email?.split('@')[0] || 'Unknown User',
        role,
        permissions
      };

      req.user = userObj;

      console.log(`[AUTH] User authenticated:`, {
        email: userObj.email,
        role: userObj.role,
        permissions: userObj.permissions.length
      });
      
      next();
    } catch (verifyError) {
      console.error('[AUTH] Token verification failed:', verifyError);
      return res.status(401).json({ 
        message: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }
  } catch (error) {
    console.error('[AUTH] Authentication error:', error);
    return res.status(500).json({ 
      message: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
  }
}

// Role-based access control middleware
export function requireRole(allowedRoles: Array<keyof typeof RoleTypes>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    console.log('[AUTH] Checking role access:', {
      userRole: req.user.role,
      allowedRoles,
      path: req.path
    });

    // Admin always has access
    if (req.user.role === 'admin') {
      console.log('[AUTH] Admin access granted:', {
        path: req.path,
        method: req.method
      });
      return next();
    }

    // Check if user's role is explicitly allowed
    if (allowedRoles.includes(req.user.role)) {
      console.log('[AUTH] Role-based access granted:', {
        userRole: req.user.role,
        path: req.path,
        method: req.method
      });
      return next();
    }

    // Check if the path is restricted to admin only
    if (isRestrictedPath(req.path)) {
      console.log('[AUTH] Restricted path access denied for non-admin');
      return res.status(403).json({
        message: 'This feature is restricted to administrators only',
        code: 'ADMIN_ONLY',
        currentRole: req.user.role
      });
    }


    // For manager role, check specific permissions
    if (req.user.role === 'manager' && !isRestrictedPath(req.path)) {
      return next();
    }

    // For staff role, check specific permissions
    if (req.user.role === 'staff') {
      const staffAllowedPaths = ['/api/stats', '/api/appointments', '/api/customers'];
      if (staffAllowedPaths.some(path => req.path.startsWith(path))) {
        return next();
      }
    }

    // Deny access if none of the above conditions are met
    return res.status(403).json({
      message: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
      code: 'INSUFFICIENT_ROLE',
      requiredRoles: allowedRoles,
      currentRole: req.user.role
    });
  };
}

// Permission-based access control middleware
export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    // Admin has all permissions
    if (req.user.role === 'admin') {
      return next();
    }

    const hasPermission = req.user.permissions?.includes(permission) || 
                         req.user.permissions?.includes('all');
    
    if (!hasPermission) {
      return res.status(403).json({
        message: `Access denied. Missing required permission: ${permission}`,
        code: 'INSUFFICIENT_PERMISSION',
        requiredPermission: permission,
        userPermissions: req.user.permissions
      });
    }

    next();
  };
}

// User management middleware
export function validateUserManagement(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ 
      message: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  // Only admin can manage users
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      message: 'Only administrators can manage users',
      code: 'ADMIN_REQUIRED',
      currentRole: req.user.role
    });
  }

  next();
}

// Manager operation validation middleware
type Permission = string;

export function validateManagerOperation(operation: Permission | Permission[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    // Admin has full access
    if (req.user.role === 'admin') {
      return next();
    }

    // Enforce manager role
    if (req.user.role !== 'manager') {
      return res.status(403).json({
        message: 'This operation requires manager privileges',
        code: 'MANAGER_REQUIRED',
        requiredRole: RoleTypes.manager,
        currentRole: req.user.role
      });
    }

    // Check required permissions
    const requiredOperations = Array.isArray(operation) ? operation : [operation];
    const missingPermissions = requiredOperations.filter(
      op => !req.user?.permissions.includes(op) && !req.user?.permissions.includes('all')
    );
    
    if (missingPermissions.length > 0) {
      return res.status(403).json({
        message: 'Insufficient permissions for this operation',
        code: 'INSUFFICIENT_MANAGER_PERMISSION',
        requiredOperations,
        missingPermissions,
        userPermissions: req.user.permissions
      });
    }

    next();
  };
}