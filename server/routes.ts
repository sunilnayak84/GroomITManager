import { Router, Request, Response } from 'express';
import { auth, db } from './firebase';
import * as admin from 'firebase-admin';

const router = Router();
router.use((req, res, next) => {
  console.log('API Request:', {
    method: req.method,
    url: req.url,
    body: req.body,
    path: req.path,
    baseUrl: req.baseUrl
  });
  next();
});

router.post('/staff/create', express.json(), async (req: Request, res: Response) => {
  console.log('Received staff creation request:', req.body);
  try {
    const { email, password, name, role, phone } = req.body;
    console.log('Attempting to create staff member:', { email, name, role, phone });

    // Validate required fields
    if (!email || !name || !role) {
      return res.status(400).json({ 
        message: 'Missing required fields', 
        details: { email: !email, name: !name, role: !role } 
      });
    }

    // Validate role
    const validRoles = ['staff', 'groomer', 'pet_walker', 'receptionist'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ 
        message: 'Invalid role specified',
        validRoles 
      });
    }

    // Create user in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email,
      password: password || 'Welcome123!',
      displayName: name,
      phoneNumber: phone,
      disabled: false
    }).catch(error => {
      console.error('Firebase Auth user creation failed:', error);
      throw new Error(`Auth creation failed: ${error.message}`);
    });

    // Get role permissions from roles collection
    const roleDoc = await admin.firestore().collection('roles').doc(role).get();
    if (!roleDoc.exists) {
      throw new Error(`Role ${role} not found in roles collection`);
    }

    const roleData = roleDoc.data();
    const permissions = roleData?.permissions || [];

    // Set custom claims with role and permissions
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      role,
      permissions,
      isStaff: true,
      createdAt: new Date().toISOString()
    }).catch(error => {
      console.error('Setting custom claims failed:', error);
      throw new Error(`Failed to set role permissions: ${error.message}`);
    });

    console.log(`Successfully created staff member ${name} with role ${role} and permissions:`, permissions);
    res.json({ 
      uid: userRecord.uid,
      message: 'Staff member created successfully'
    });
  } catch (error) {
    console.error('Error creating staff:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      res.status(500).json({ message: error.message, success: false });
    } else {
      res.status(500).json({ message: 'Unknown error occurred', success: false });
    }
  }
});

export const registerRoutes = (app: any) => {
  // Register routes with base path
  const apiRouter = express.Router();
  apiRouter.use(router);
  app.use('/api', apiRouter);
  
  // Log all registered routes
  const routes = apiRouter._router.stack
    .filter((r: any) => r.route)
    .map((r: any) => `${Object.keys(r.route.methods).join(',')} ${r.route.path}`);
  
  console.log('Available API routes:', routes);
  
  // Add catch-all for API 404s
  app.use('/api/*', (req, res) => {
    console.log('404 Not Found:', req.method, req.url);
    res.status(404).json({ message: `Route ${req.method} ${req.url} not found` });
  });
};