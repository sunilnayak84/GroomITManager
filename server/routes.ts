import { Router } from 'express';
import { auth } from './firebase';

const router = Router();

router.post('/api/staff/create', async (req, res) => {
  try {
    const { email, password, name, role, phone } = req.body;
    
    // Validate required fields
    if (!email || !name || !role) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password: password || 'Welcome123!',
      displayName: name,
      phoneNumber: phone,
    });

    // Get role permissions
    const rolePermissions = RolePermissions[role] || [];

    // Set custom claims with role and permissions
    await auth.setCustomUserClaims(userRecord.uid, {
      role,
      isStaff: true,
      permissions: rolePermissions,
      createdAt: new Date().toISOString()
    });

    // Add role to realtime database for faster queries
    const db = admin.database();
    await db.ref(`roles/${userRecord.uid}`).set({
      role,
      permissions: rolePermissions,
      updatedAt: Date.now()
    });

    console.log(`Created staff member ${name} (${email}) with role ${role}`);
    res.json({ uid: userRecord.uid });
  } catch (error) {
    console.error('Error creating staff:', error);
    res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error occurred' });
  }
});

export const registerRoutes = (app: any) => {
  router.post('/api/staff/create', async (req, res) => {
    try {
      const { email, password, name, role } = req.body;
      
      // Create user in Firebase Auth
      const userRecord = await auth.createUser({
        email,
        password: password || 'Welcome123!', // Default password
        displayName: name,
      });

      // Set custom claims based on role
      await auth.setCustomUserClaims(userRecord.uid, {
        role,
        isStaff: true
      });

      res.json({ uid: userRecord.uid });
    } catch (error) {
      console.error('Error creating staff:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error occurred' });
    }
  });

  app.use(router);
};