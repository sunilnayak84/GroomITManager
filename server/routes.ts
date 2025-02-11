import { Router } from 'express';
import { auth } from './firebase';

const router = Router();

router.post('/api/staff/create', async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    
    // Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password,
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

export const registerRoutes = (app: any) => {
  app.use(router);
};