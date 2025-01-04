import { Request, Response, NextFunction } from 'express';
import { 
  RoleTypes,
  ALL_PERMISSIONS,
  getFirebaseAuth,
  getFirebaseDatabase
} from '../firebase';

// Type for authenticated request
interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email: string | null;
    role: keyof typeof RoleTypes;
    permissions: string[];
  };
}

// Middleware to verify Firebase token and set user information
export async function authenticateFirebase(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'No authentication token provided',
        code: 'NO_TOKEN'
      });
    }

    const token = authHeader.split('Bearer ')[1];
    const auth = getFirebaseAuth();
    const decodedToken = await auth.verifyIdToken(token);

    // Get user's role and permissions from Realtime Database
    const db = getFirebaseDatabase();
    const userRoleRef = await db.ref(`roles/${decodedToken.uid}`).once('value');
    const roleData = userRoleRef.val();

    if (!roleData?.role) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'User role not found',
        code: 'NO_ROLE'
      });
    }

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || null,
      role: roleData.role,
      permissions: roleData.permissions || []
    };

    next();
  } catch (error) {
    console.error('[AUTH] Token verification failed:', error);
    return res.status(401).json({ 
      error: 'Authentication failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      code: 'AUTH_FAILED'
    });
  }
}

// Middleware to check role requirements
export function requireRole(allowedRoles: (keyof typeof RoleTypes)[]) {
  return async function(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Unauthorized',
          message: 'Authentication required',
          code: 'NO_AUTH'
        });
      }

      const userRole = req.user.role;

      // Admin role always has access
      if (userRole === RoleTypes.ADMIN) {
        return next();
      }

      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Insufficient role permissions',
          code: 'INVALID_ROLE',
          required: allowedRoles,
          current: userRole
        });
      }

      next();
    } catch (error) {
      console.error('[AUTH] Role verification failed:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Role verification failed',
        code: 'ROLE_CHECK_FAILED'
      });
    }
  };
}

// Middleware to check specific permissions
export function requirePermission(requiredPermissions: string[]) {
  return async function(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Unauthorized',
          message: 'Authentication required',
          code: 'NO_AUTH'
        });
      }

      // Admin role has all permissions
      if (req.user.role === RoleTypes.ADMIN) {
        return next();
      }

      const hasRequiredPermissions = requiredPermissions.every(permission =>
        req.user!.permissions.includes(permission)
      );

      if (!hasRequiredPermissions) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Insufficient permissions',
          code: 'INVALID_PERMISSIONS',
          required: requiredPermissions,
          current: req.user.permissions
        });
      }

      next();
    } catch (error) {
      console.error('[AUTH] Permission verification failed:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Permission verification failed',
        code: 'PERMISSION_CHECK_FAILED'
      });
    }
  };
}