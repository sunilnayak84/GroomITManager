import { Router } from 'express';
import { auth, db } from './firebase';
import * as admin from 'firebase-admin';

const router = Router();

router.post('/api/staff/create', async (req, res) => {
  try {
    const { email, password, name, role, phone } = req.body;
    
    // Validate role
    const validRoles = ['staff', 'groomer', 'pet_walker', 'receptionist'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role specified' });
    }

    // Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password: password || 'Welcome123!',
      displayName: name,
      phoneNumber: phone,
      disabled: false
    });

    // Get role permissions from roles collection
    const roleDoc = await admin.firestore().collection('roles').doc(role).get();
    if (!roleDoc.exists) {
      throw new Error(`Role ${role} not found in roles collection`);
    }

    const roleData = roleDoc.data();
    const permissions = roleData?.permissions || [];

    // Set custom claims with role and permissions
    await auth.setCustomUserClaims(userRecord.uid, {
      role,
      permissions,
      isStaff: true,
      createdAt: new Date().toISOString()
    });

    console.log(`Created staff member ${name} with role ${role} and permissions:`, permissions);
    res.json({ uid: userRecord.uid });
  } catch (error) {
    console.error('Error creating staff:', error);
    res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error occurred' });
  }
});

export const registerRoutes = (app: any) => {
  app.use('/api', router);
  app.post('/api/staff/create', async (req, res) => {
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