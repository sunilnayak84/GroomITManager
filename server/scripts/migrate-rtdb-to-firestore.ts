
import { initializeFirebaseAdmin } from '../firebase';
import { getDatabase } from 'firebase-admin/database';
import { getFirestore } from 'firebase-admin/firestore';

async function migrateRTDBToFirestore() {
  console.log('Starting migration from RTDB to Firestore...');
  
  const app = await initializeFirebaseAdmin();
  const rtdb = getDatabase(app);
  const firestore = getFirestore(app);
  
  try {
    // Migrate role definitions
    console.log('Migrating role definitions...');
    const roleDefsSnapshot = await rtdb.ref('role-definitions').once('value');
    const roleDefs = roleDefsSnapshot.val();
    
    if (roleDefs) {
      const batch = firestore.batch();
      
      for (const [roleName, roleData] of Object.entries(roleDefs)) {
        const roleRef = firestore.collection('role-definitions').doc(roleName);
        batch.set(roleRef, {
          ...roleData,
          migratedAt: new Date(),
          source: 'rtdb_migration'
        });
      }
      
      await batch.commit();
      console.log('Role definitions migrated successfully');
    }

    // Migrate user roles
    console.log('Migrating user roles...');
    const rolesSnapshot = await rtdb.ref('roles').once('value');
    const roles = rolesSnapshot.val();
    
    if (roles) {
      const batch = firestore.batch();
      
      for (const [userId, roleData] of Object.entries(roles)) {
        const roleRef = firestore.collection('roles').doc(userId);
        batch.set(roleRef, {
          ...roleData,
          migratedAt: new Date(),
          source: 'rtdb_migration'
        });
      }
      
      await batch.commit();
      console.log('User roles migrated successfully');
    }

    console.log('Migration completed successfully');
    return true;
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Run the migration
migrateRTDBToFirestore()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
