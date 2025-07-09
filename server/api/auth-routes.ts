import { Router, Request, Response } from 'express';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { RoleTypes, DefaultPermissions } from '../firebase.js';
import { setUserRole, getUserRole } from '../auth-firestore.js';
import { logger } from '../utils/logger.js';

export const authRouter = Router();

// Get all users with proper Firebase Auth metadata
authRouter.get('/users', async (req: Request, res: Response) => {
  try {
    logger.info('[AUTH-ROUTES] Fetching all users');

    // Check if user has permission to view users
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'manager')) {
      return res.status(403).json({ 
        message: 'Insufficient permissions to view users' 
      });
    }

    const auth = getAuth();
    const db = getFirestore();

    // Get users from Firebase Auth (supports pagination)
    const listUsersResult = await auth.listUsers(1000);
    
    const users = await Promise.all(
      listUsersResult.users.map(async (userRecord) => {
        try {
          // Get role information from Firestore
          const userDoc = await db.collection('users').doc(userRecord.uid).get();
          const userData = userDoc.exists ? userDoc.data() : null;
          
          // Check custom claims for role if database doesn't have it
          const customClaims = userRecord.customClaims || {};
          let userRole = userData?.role || 'staff';
          
          // If user has admin custom claims but database shows staff, use custom claims
          if (customClaims.isAdmin === true || customClaims.role === 'admin') {
            userRole = 'admin';
          }
          
          return {
            uid: userRecord.uid,
            email: userRecord.email || null,
            displayName: userRecord.displayName || userRecord.email?.split('@')[0] || 'Unknown User',
            role: userRole,
            disabled: userRecord.disabled || false,
            lastSignInTime: userRecord.metadata.lastSignInTime || 'Never',
            createdAt: userRecord.metadata.creationTime || null,
            emailVerified: userRecord.emailVerified || false,
            phoneNumber: userRecord.phoneNumber || null
          };
        } catch (error) {
          logger.error('[AUTH-ROUTES] Error processing user:', { uid: userRecord.uid, error });
          return {
            uid: userRecord.uid,
            email: userRecord.email || null,
            displayName: userRecord.displayName || 'Unknown User',
            role: 'staff',
            disabled: userRecord.disabled || false,
            lastSignInTime: 'Never',
            createdAt: userRecord.metadata.creationTime || null,
            emailVerified: false,
            phoneNumber: null
          };
        }
      })
    );

    logger.info('[AUTH-ROUTES] Successfully fetched users:', { count: users.length });
    res.json(users);
  } catch (error) {
    logger.error('[AUTH-ROUTES] Error fetching users:', error);
    res.status(500).json({ 
      message: 'Failed to fetch users',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get all role definitions
authRouter.get('/roles', async (req: Request, res: Response) => {
  try {
    logger.info('[AUTH-ROUTES] Fetching role definitions');

    const db = getFirestore();
    const rolesSnapshot = await db.collection('role-definitions').get();
    
    const roles = rolesSnapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.id,
      ...doc.data()
    }));

    logger.info('[AUTH-ROUTES] Successfully fetched roles:', { count: roles.length });
    res.json(roles);
  } catch (error) {
    logger.error('[AUTH-ROUTES] Error fetching roles:', error);
    res.status(500).json({ 
      message: 'Failed to fetch roles',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update user role
authRouter.post('/update-user-role', async (req: Request, res: Response) => {
  try {
    logger.info('[AUTH-ROUTES] Role update request:', req.body);

    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Check if user has permission to update roles
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ 
        message: 'Insufficient permissions to update user roles' 
      });
    }

    const { userId, role } = req.body;

    if (!userId || !role) {
      return res.status(400).json({ 
        message: 'userId and role are required' 
      });
    }

    // Validate role exists in role definitions or default roles
    const validRoles = Object.keys(RoleTypes);
    if (!validRoles.includes(role)) {
      return res.status(400).json({ 
        message: `Invalid role. Valid roles are: ${validRoles.join(', ')}` 
      });
    }

    // Verify the user exists in Firebase Auth
    const auth = getAuth();
    try {
      await auth.getUser(userId);
    } catch (error) {
      return res.status(404).json({ 
        message: 'User not found in Firebase Auth' 
      });
    }

    // Update user role using the existing function
    await setUserRole(userId, role as keyof typeof RoleTypes, req.user.id);

    logger.info('[AUTH-ROUTES] Successfully updated user role:', { userId, role, actorId: req.user.id });

    res.json({ 
      message: 'User role updated successfully',
      userId,
      role,
      updatedBy: req.user.id
    });
  } catch (error) {
    logger.error('[AUTH-ROUTES] Role update error:', error);
    res.status(500).json({ 
      message: 'Failed to update user role',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create new user
authRouter.post('/create-user', async (req: Request, res: Response) => {
  try {
    logger.info('[AUTH-ROUTES] User creation request:', { 
      email: req.body.email, 
      role: req.body.role 
    });

    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Check if user has permission to create users
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ 
        message: 'Insufficient permissions to create users' 
      });
    }

    const { 
      email, 
      password, 
      displayName, 
      role, 
      phoneNumber 
    } = req.body;

    if (!email || !role) {
      return res.status(400).json({ 
        message: 'Email and role are required' 
      });
    }

    // Validate role
    const validRoles = Object.keys(RoleTypes);
    if (!validRoles.includes(role)) {
      return res.status(400).json({ 
        message: `Invalid role. Valid roles are: ${validRoles.join(', ')}` 
      });
    }

    const auth = getAuth();
    const db = getFirestore();

    // Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password: password || 'Welcome123!', // Default password if not provided
      displayName: displayName || email.split('@')[0],
      phoneNumber: phoneNumber ? (phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`) : undefined,
      disabled: false,
      emailVerified: false
    });

    // Set custom claims for the role
    const permissions = DefaultPermissions[role as keyof typeof DefaultPermissions] || DefaultPermissions.staff;
    await auth.setCustomUserClaims(userRecord.uid, {
      role,
      permissions,
      createdAt: new Date().toISOString()
    });

    // Create user document in Firestore
    await db.collection('users').doc(userRecord.uid).set({
      email: userRecord.email,
      displayName: userRecord.displayName,
      role,
      permissions,
      createdAt: new Date().toISOString(),
      createdBy: req.user.id,
      disabled: false,
      lastUpdated: new Date().toISOString()
    });

    // Create role history entry
    await db.collection('role-history').add({
      userId: userRecord.uid,
      role,
      permissions,
      actorId: req.user.id,
      timestamp: new Date().toISOString(),
      action: 'user_created'
    });

    logger.info('[AUTH-ROUTES] Successfully created user:', { 
      uid: userRecord.uid, 
      email: userRecord.email, 
      role 
    });

    res.status(201).json({
      message: 'User created successfully',
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        role,
        disabled: false,
        createdAt: userRecord.metadata.creationTime,
        emailVerified: userRecord.emailVerified
      }
    });
  } catch (error) {
    logger.error('[AUTH-ROUTES] User creation error:', error);
    
    // Handle specific Firebase Auth errors
    if (error instanceof Error) {
      if (error.message.includes('email-already-exists')) {
        return res.status(409).json({ 
          message: 'A user with this email already exists' 
        });
      }
      if (error.message.includes('invalid-email')) {
        return res.status(400).json({ 
          message: 'Invalid email address format' 
        });
      }
      if (error.message.includes('weak-password')) {
        return res.status(400).json({ 
          message: 'Password is too weak. Must be at least 6 characters.' 
        });
      }
    }

    res.status(500).json({ 
      message: 'Failed to create user',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Sync user role (refresh custom claims)
authRouter.post('/sync-role', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { userId } = req.body;
    const targetUserId = userId || req.user.id;

    // Only admins can sync other users' roles
    if (userId && userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Insufficient permissions to sync other users roles' 
      });
    }

    const userRole = await getUserRole(targetUserId);
    
    // Update custom claims to match Firestore data
    const auth = getAuth();
    await auth.setCustomUserClaims(targetUserId, {
      role: userRole.role,
      permissions: userRole.permissions,
      lastSynced: new Date().toISOString()
    });
    
    logger.info('[AUTH-ROUTES] Successfully synced role:', { 
      userId: targetUserId, 
      role: userRole.role 
    });

    res.json({ 
      message: 'Role synced successfully',
      role: userRole.role,
      permissions: userRole.permissions
    });
  } catch (error) {
    logger.error('[AUTH-ROUTES] Role sync error:', error);
    res.status(500).json({ 
      message: 'Failed to sync role',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Delete user (disable, don't actually delete for audit purposes)
authRouter.post('/disable-user', async (req: Request, res: Response) => {
  try {
    logger.info('[AUTH-ROUTES] User disable request:', req.body);

    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Check if user has permission to disable users
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Insufficient permissions to disable users' 
      });
    }

    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ 
        message: 'userId is required' 
      });
    }

    // Prevent self-disable
    if (userId === req.user.id) {
      return res.status(400).json({ 
        message: 'Cannot disable your own account' 
      });
    }

    const auth = getAuth();
    const db = getFirestore();

    // Disable user in Firebase Auth
    await auth.updateUser(userId, { disabled: true });

    // Update user document in Firestore
    await db.collection('users').doc(userId).update({
      disabled: true,
      disabledAt: new Date().toISOString(),
      disabledBy: req.user.id,
      lastUpdated: new Date().toISOString()
    });

    // Create audit log entry
    await db.collection('role-history').add({
      userId,
      actorId: req.user.id,
      timestamp: new Date().toISOString(),
      action: 'user_disabled'
    });

    logger.info('[AUTH-ROUTES] Successfully disabled user:', { userId, actorId: req.user.id });

    res.json({ 
      message: 'User disabled successfully',
      userId
    });
  } catch (error) {
    logger.error('[AUTH-ROUTES] User disable error:', error);
    res.status(500).json({ 
      message: 'Failed to disable user',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default authRouter;