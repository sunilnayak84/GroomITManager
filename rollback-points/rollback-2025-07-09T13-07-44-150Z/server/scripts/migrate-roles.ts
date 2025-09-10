
import { initializeFirebaseAdmin } from '../firebase';
import { getDatabase } from 'firebase-admin/database';
import { getFirestore } from 'firebase-admin/firestore';

async function migrateRoles() {
  console.log('Starting role migration from RTDB to Firestore...');
  
  const app = await initializeFirebaseAdmin();
  const rtdb = getDatabase(app);
  const firestore = getFirestore(app);
  
  try {
    const rolesSnapshot = await rtdb.ref('roles').once('value');
    const roles = rolesSnapshot.val();
    
    if (!roles) {
      console.log('No roles found in RTDB');
      return;
    }

    interface RoleData {
      role: string;
      permissions: string[];
      updatedAt?: Date;
    }

    const batch = firestore.batch();
    
    for (const [userId, roleData] of Object.entries(roles) as [string, RoleData][]) {
      console.log(`Migrating role for user ${userId}`);
      const roleRef = firestore.collection('roles').doc(userId);
      batch.set(roleRef, {
        ...roleData,
        updatedAt: new Date(),
        migratedAt: new Date(),
        source: 'rtdb_migration'
      });
    }

    await batch.commit();
    console.log('Migration completed successfully');
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

migrateRoles()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
