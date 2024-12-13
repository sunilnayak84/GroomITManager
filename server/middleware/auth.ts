import { Request, Response, NextFunction } from 'express';
import { firebaseAdmin, getRoleFromFirebase, type RoleType, type Permission } from '../firebase-admin';
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        email?: string | null;
        displayName?: string | null;
        role: RoleType;
        permissions: Permission[];
      };
    }
  }
}

// Manager-specific restricted paths
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
    const auth = admin.auth();
    const db = getFirestore();
    
    try {
      console.log('🔍 Verifying Firebase token...');
      const decodedToken = await auth.verifyIdToken(idToken);
      const firebaseUser = await auth.getUser(decodedToken.uid);
      
      console.log(`🔍 Fetching user data for ${firebaseUser.email}...`);
      
      // Get user's custom claims from Firebase
      const { customClaims } = firebaseUser;
      const userRole = (customClaims?.role as RoleType) || 'staff';
      
      // Fetch role data from Firebase
      const roleData = await getRoleFromFirebase(userRole);
      
      // Get user document from Firestore
      const userDoc = await db.collection('users').doc(firebaseUser.uid).get();
      
      if (!userDoc.exists) {
        // Create new user document in Firestore if it doesn't exist
        await db.collection('users').doc(firebaseUser.uid).set({
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Unknown User',
          role: userRole,
          permissions: roleData.permissions,
          isActive: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      const userData = userDoc.exists ? userDoc.data() : null;
      
      // Check if user is active in Firestore
      if (userData && userData.isActive === false) {
        console.error(`❌ User ${firebaseUser.email} is inactive`);
        return res.status(403).json({
          message: 'User account is inactive',
          code: 'INACTIVE_USER'
        });
      }

      req.user = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        role: roleData.name,
        permissions: roleData.permissions
      };
      
      console.log(`🟢 Authenticated user: ${firebaseUser.email} (${roleData.name})`);
      next();
    } catch (verifyError) {
      console.error('Token verification failed:', verifyError);
      return res.status(401).json({ 
        message: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ 
      message: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
  }
}

// Role-based access control middleware
export function requireRole(allowedRoles: RoleType[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      console.error('❌ No authenticated user found in request');
      return res.status(401).json({ 
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    console.log(`🔒 Checking role access for ${req.user.email} (${req.user.role})`);
    console.log(`📋 Required roles: ${allowedRoles.join(', ')}`);

    // Admin has access to everything
    if (req.user.role === 'admin') {
      console.log('✅ Admin access granted');
      return next();
    }

    // For manager role, check restricted paths
    if (req.user.role === 'manager' && isRestrictedPath(req.path)) {
      console.log(`❌ Manager restricted from accessing: ${req.path}`);
      return res.status(403).json({
        message: 'Managers cannot access user management features',
        code: 'MANAGER_RESTRICTED',
        path: req.path
      });
    }

    // Check if user's role is allowed
    if (!allowedRoles.includes(req.user.role)) {
      console.log(`❌ Access denied for role ${req.user.role}`);
      return res.status(403).json({
        message: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
        code: 'INSUFFICIENT_ROLE',
        requiredRoles: allowedRoles,
        currentRole: req.user.role,
        userPermissions: req.user.permissions
      });
    }

    console.log('✅ Role check passed');
    next();
  };
}

// Permission-based access control middleware
export function requirePermission(permission: Permission) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    if (req.user.role === 'admin') {
      return next(); // Admin has all permissions
    }

    const roleData = await getRoleFromFirebase(req.user.role);
    const rolePermissions = roleData.permissions;
    if (!rolePermissions?.includes(permission) && !rolePermissions?.includes('all')) {
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

// Manager operation validation middleware with enhanced checks
export function validateManagerOperation(operation: string | string[]) {
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
        requiredRole: 'manager',
        currentRole: req.user.role
      });
    }

    // Handle both single operation and multiple required operations
    const requiredOperations = Array.isArray(operation) ? operation : [operation];
    const managerPermissions = RolePermissions.manager;
    
    // Check if manager has all required permissions
    const missingPermissions = requiredOperations.filter(op => !managerPermissions.includes(op));
    
    if (missingPermissions.length > 0) {
      return res.status(403).json({
        message: 'Insufficient permissions for this operation',
        code: 'INSUFFICIENT_MANAGER_PERMISSION',
        requiredOperations,
        missingPermissions,
        userPermissions: managerPermissions
      });
    }

    // Check for branch-specific operations if branchId is present
    if (req.user.branchId && req.params.branchId && req.user.branchId !== parseInt(req.params.branchId)) {
      return res.status(403).json({
        message: 'Access restricted to assigned branch only',
        code: 'BRANCH_ACCESS_DENIED',
        userBranch: req.user.branchId,
        requestedBranch: req.params.branchId
      });
    }

    next();
  };
}