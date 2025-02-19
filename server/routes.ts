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
router.get('/api/roles', authenticateFirebase, requireRole(['admin']), async (req: Request, res: Response) => {
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

router.get('/api/users', authenticateFirebase, requireRole(['admin']), async (req: Request, res: Response) => {
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

// Register routes
export function registerRoutes(app: Express.Application) {
  // Mount all routes directly under /api without the authenticateFirebase middleware
  app.use('/api', router);

  // API 404 handler
  app.use('/api/*', (req: Request, res: Response) => {
    console.log('[API] 404 Not Found:', req.method, req.url);
    res.status(404).json({
      message: `Route ${req.method} ${req.url} not found`
    });
  });
}