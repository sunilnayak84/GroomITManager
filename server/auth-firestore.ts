import { type Express } from "express";
import * as admin from "firebase-admin";
import {
  RoleTypes,
  DefaultPermissions,
  Permission,
  getFirebaseAdmin,
  initializeFirebaseAdmin
} from "./firebase.js";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

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

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: FirebaseUser;
    }
  }
}

// Get user role from Firestore
export async function getUserRole(userId: string): Promise<{ role: string; permissions: string[] }> {
  try {
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (userDoc.exists) {
      const userData = userDoc.data();
      const userRole = userData?.role || 'staff';
      
      // Get permissions from the role definition, not from user document
      const roleDoc = await db.collection('role-definitions').doc(userRole).get();
      
      if (roleDoc.exists) {
        const roleData = roleDoc.data();
        console.log(`[AUTH] Found role definition for ${userRole}:`, roleData);
        return {
          role: userRole,
          permissions: roleData?.permissions || DefaultPermissions[userRole as keyof typeof DefaultPermissions] || DefaultPermissions.staff
        };
      } else {
        console.log(`[AUTH] No role definition found for ${userRole}, using defaults`);
        return {
          role: userRole,
          permissions: DefaultPermissions[userRole as keyof typeof DefaultPermissions] || DefaultPermissions.staff
        };
      }
    }
    
    // Default role if user doesn't exist
    return {
      role: 'staff',
      permissions: DefaultPermissions.staff
    };
  } catch (error) {
    console.error('[AUTH] Error getting user role:', error);
    return {
      role: 'staff',
      permissions: DefaultPermissions.staff
    };
  }
}

// Set user role in Firestore and custom claims
export async function setUserRole(userId: string, role: keyof typeof RoleTypes, actorId?: string): Promise<void> {
  try {
    console.log(`[AUTH] Setting role ${role} for user ${userId}`);
    
    const db = getFirestore();
    const permissions = DefaultPermissions[role] || DefaultPermissions.staff;
    
    // Update user document in Firestore
    await db.collection('users').doc(userId).set({
      role: role,
      permissions: permissions,
      updatedAt: Date.now()
    }, { merge: true });
    
    // Set custom claims in Firebase Auth
    const auth = getAuth();
    await auth.setCustomUserClaims(userId, {
      role: role,
      permissions: permissions,
      isAdmin: role === 'admin',
      updatedAt: Date.now()
    });
    
    // Create role history entry
    await db.collection('role-history').add({
      userId: userId,
      role: role,
      permissions: permissions,
      actorId: actorId || 'system',
      timestamp: Date.now(),
      action: 'role_update'
    });
    
    console.log(`[AUTH] Successfully set role ${role} for user ${userId}`);
  } catch (error) {
    console.error('[AUTH] Error setting user role:', error);
    throw error;
  }
}

// Create user in Firestore
export async function createUserInFirestore(user: FirebaseUser): Promise<boolean> {
  try {
    const db = getFirestore();
    const userRef = db.collection('users').doc(user.id);

    // Check if user exists
    const snapshot = await userRef.get();
    if (snapshot.exists) {
      return true;
    }

    // Create user data
    const userData = {
      id: user.id,
      email: user.email,
      name: user.name,
      displayName: user.displayName,
      role: user.role,
      permissions: user.permissions,
      createdAt: Date.now(),
      lastUpdated: Date.now()
    };

    // Save to Firestore
    await userRef.set(userData);
    console.log('[AUTH] Created new user in Firestore:', userData);

    // Set custom claims
    const auth = getAuth();
    await auth.setCustomUserClaims(user.id, {
      role: user.role,
      permissions: user.permissions
    });

    return true;
  } catch (error) {
    console.error('[AUTH] Error creating user in Firestore:', error);
    return false;
  }
}

// Sync user role - endpoint for frontend to sync roles
export async function syncUserRole(userId: string): Promise<{ role: string; permissions: string[] }> {
  try {
    const userRole = await getUserRole(userId);
    
    // Update custom claims to match Firestore data
    const auth = getAuth();
    await auth.setCustomUserClaims(userId, {
      role: userRole.role,
      permissions: userRole.permissions
    });
    
    console.log(`[AUTH] Synced role for user ${userId}: ${userRole.role}`);
    return userRole;
  } catch (error) {
    console.error('[AUTH] Error syncing user role:', error);
    throw error;
  }
}

// Setup authentication middleware for Firestore
export function setupAuthenticationFirestore(app: Express) {
  console.log('[AUTH] Setting up Firestore authentication middleware');

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

      const token = authHeader.split('Bearer ')[1];
      const auth = getAuth();
      const decodedToken = await auth.verifyIdToken(token);

      // Get role and permissions from Firestore
      const userRole = await getUserRole(decodedToken.uid);

      // Get or create user in Firestore
      const db = getFirestore();
      const userRef = db.collection('users').doc(decodedToken.uid);
      const snapshot = await userRef.get();
      
      if (!snapshot.exists) {
        const newUser = {
          id: decodedToken.uid,
          email: decodedToken.email || '',
          name: decodedToken.name || decodedToken.email || '',
          displayName: decodedToken.name || decodedToken.email?.split('@')[0] || 'Unknown User',
          role: userRole.role as keyof typeof RoleTypes,
          permissions: userRole.permissions,
          createdAt: Date.now(),
          lastUpdated: Date.now()
        };
        await userRef.set(newUser);
        console.log('[AUTH] Created new user in Firestore:', newUser);
      }

      req.user = {
        id: decodedToken.uid,
        uid: decodedToken.uid,
        email: decodedToken.email || '',
        name: decodedToken.name || decodedToken.email || '',
        displayName: decodedToken.name || decodedToken.email?.split('@')[0] || 'Unknown User',
        role: userRole.role as keyof typeof RoleTypes,
        permissions: userRole.permissions
      };

      next();
    } catch (error) {
      console.error('[AUTH] Authentication error:', error);
      return res.status(401).json({
        message: "Authentication failed",
        error: error instanceof Error ? error.message : 'Unknown error',
        code: "AUTH_ERROR"
      });
    }
  });

  // Add role sync endpoint
  app.post('/api/auth/sync-role', async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const syncedRole = await syncUserRole(req.user.id);
      res.json(syncedRole);
    } catch (error) {
      console.error('[AUTH] Role sync error:', error);
      res.status(500).json({ 
        message: 'Failed to sync role',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Add user role update endpoint
  app.post('/api/auth/update-user-role', async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      // Check if user has permission to update roles
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Insufficient permissions to update user roles' });
      }

      const { userId, role } = req.body;

      if (!userId || !role) {
        return res.status(400).json({ message: 'userId and role are required' });
      }

      // Validate role
      if (!Object.values(RoleTypes).includes(role)) {
        return res.status(400).json({ message: 'Invalid role specified' });
      }

      // Update user role using the existing function
      await setUserRole(userId, role, req.user.id);

      res.json({ 
        message: 'User role updated successfully',
        userId,
        role
      });
    } catch (error) {
      console.error('[AUTH] Role update error:', error);
      res.status(500).json({ 
        message: 'Failed to update user role',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  console.log('[AUTH] Firestore authentication middleware setup completed');
}