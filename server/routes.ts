import { Router, Request, Response } from 'express';
import { admin } from './firebase';
import * as Express from 'express';
import { staffManagementRouter } from './api/staff-management';
import { authenticateFirebase, requireRole } from './middleware/auth';

const router = Router();

// Global API request logging middleware
router.use((req, res, next) => {
  console.log('[API] Request:', {
    method: req.method,
    url: req.url,
    path: req.path,
    baseUrl: req.baseUrl
  });
  next();
});

// Role management endpoints
router.get('/roles', authenticateFirebase, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    console.log('[ROLES] Fetching role definitions...');
    const firestore = admin.firestore();
    const rolesSnapshot = await firestore.collection('role-definitions').get();

    const roles = rolesSnapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.id,
      ...doc.data()
    }));

    console.log('[ROLES] Successfully fetched roles:', roles.length);
    res.json(roles);
  } catch (error) {
    console.error('[ROLES] Error fetching roles:', error);
    res.status(500).json({ 
      error: 'Failed to fetch roles',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/roles', authenticateFirebase, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { name, permissions } = req.body;

    if (!name || !permissions) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const firestore = admin.firestore();
    await firestore.collection('role-definitions').doc(name).set({
      permissions,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(201).json({
      id: name,
      name,
      permissions
    });
  } catch (error) {
    console.error('[ROLES] Error creating role:', error);
    res.status(500).json({ error: 'Failed to create role' });
  }
});

router.put('/roles/:name', authenticateFirebase, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const { permissions } = req.body;

    if (!permissions) {
      return res.status(400).json({ error: 'Missing permissions' });
    }

    const firestore = admin.firestore();
    await firestore.collection('role-definitions').doc(name).update({
      permissions,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({
      id: name,
      name,
      permissions
    });
  } catch (error) {
    console.error('[ROLES] Error updating role:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

router.get('/users', authenticateFirebase, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    console.log('[USERS] Fetching users...');
    const { pageToken } = req.query;
    const auth = admin.auth();
    const firestore = admin.firestore();

    const listUsersResult = await auth.listUsers(1000, pageToken as string);
    const users = await Promise.all(
      listUsersResult.users.map(async (user) => {
        const userDoc = await firestore.collection('users').doc(user.uid).get();
        const userData = userDoc.data();

        return {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          role: userData?.role || 'user',
          disabled: user.disabled,
          lastSignInTime: user.metadata.lastSignInTime,
          creationTime: user.metadata.creationTime
        };
      })
    );

    console.log('[USERS] Successfully fetched users:', users.length);
    res.json({
      users,
      pageToken: listUsersResult.pageToken
    });
  } catch (error) {
    console.error('[USERS] Error fetching users:', error);
    res.status(500).json({ 
      error: 'Failed to fetch users',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/users/:userId/role', authenticateFirebase, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!userId || !role) {
      return res.status(400).json({ error: 'Missing userId or role' });
    }

    console.log('[USERS] Updating role for user:', userId, 'to:', role);

    const firestore = admin.firestore();
    const auth = admin.auth();

    // Update Firestore
    await firestore.collection('users').doc(userId).set({
      role,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    // Update custom claims
    await auth.setCustomUserClaims(userId, { role });

    console.log('[USERS] Successfully updated role for user:', userId);
    res.json({ message: 'Role updated successfully' });
  } catch (error) {
    console.error('[USERS] Error updating user role:', error);
    res.status(500).json({ 
      error: 'Failed to update user role',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Register routes
export function registerRoutes(app: Express.Application) {
  // Mount all routes under /api
  app.use('/api', router);

  // API 404 handler
  app.use('/api/*', (req: Request, res: Response) => {
    console.log('[API] 404 Not Found:', req.method, req.url);
    res.status(404).json({
      message: `Route ${req.method} ${req.url} not found`
    });
  });
}