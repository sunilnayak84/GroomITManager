import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

// Define types for role management
export type RoleType = 'admin' | 'manager' | 'staff' | 'receptionist';

export type Permission = 
  | 'manage_appointments' | 'view_appointments' | 'create_appointments' | 'cancel_appointments'
  | 'manage_customers' | 'view_customers' | 'create_customers' | 'edit_customer_info'
  | 'manage_services' | 'view_services' | 'create_services' | 'edit_services'
  | 'manage_inventory' | 'view_inventory' | 'update_stock' | 'manage_consumables'
  | 'manage_staff_schedule' | 'view_staff_schedule' | 'manage_own_schedule'
  | 'view_analytics' | 'view_reports' | 'view_financial_reports' | 'all';

// Initialize Firebase Admin
export const firebaseAdmin = (() => {
  try {
    // Check if already initialized
    if (admin.apps.length > 0) {
      return admin.apps[0]!;
    }

    const isDevelopment = process.env.NODE_ENV === 'development';
    console.log(`🔥 Initializing Firebase Admin in ${isDevelopment ? 'development' : 'production'} mode`);

    // Format private key
    let privateKey = process.env.FIREBASE_PRIVATE_KEY || '';
    if (privateKey) {
      privateKey = privateKey.replace(/\\n/g, '\n').replace(/^['"]|['"]$/g, '');
      if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
        privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`;
      }
    }

    const credentials: admin.ServiceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey
    };

    // Use development credentials if needed
    if (isDevelopment && (!credentials.projectId || !credentials.clientEmail || !credentials.privateKey)) {
      console.log('🔧 Using development credentials');
      credentials.projectId = 'dev-project';
      credentials.clientEmail = 'dev@example.com';
      credentials.privateKey = '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC9QFi8Lg3Xy+Vj\n-----END PRIVATE KEY-----\n';
    }

    // Initialize Firebase Admin
    return admin.initializeApp({
      credential: admin.credential.cert(credentials)
    });
  } catch (error) {
    console.error('❌ Firebase Admin initialization error:', error);
    throw error;
  }
})();

// Initialize Firestore
export const db = getFirestore(firebaseAdmin);

// Initialize Firebase Admin and get Firestore instance
let db: admin.firestore.Firestore;

async function getFirestoreDB(): Promise<admin.firestore.Firestore> {
  if (!firebaseAdmin) {
    await initializeFirebaseAdmin();
  }
  if (!db) {
    db = getFirestore(firebaseAdmin);
  }
  return db;
}

// Initialize Firebase and Firestore on module load
(async () => {
  try {
    await initializeFirebaseAdmin();
    db = await getFirestoreDB();
    
    // Initialize roles in Firestore
    await initializeRoles();
    console.log('Firebase and Firestore initialization complete');
  } catch (error) {
    console.error('Failed to initialize Firebase/Firestore:', error);
    if (process.env.NODE_ENV !== 'development') {
      process.exit(1);
    }
  }
})();

// Default role definitions with their permissions
export const DefaultRoles = {
  admin: {
    name: 'admin' as RoleType,
    description: 'Full system access with user management capabilities',
    permissions: [
      'manage_appointments', 'view_appointments', 'create_appointments', 'cancel_appointments',
      'manage_customers', 'view_customers', 'create_customers', 'edit_customer_info',
      'manage_services', 'view_services', 'create_services', 'edit_services',
      'manage_inventory', 'view_inventory', 'update_stock', 'manage_consumables',
      'manage_staff_schedule', 'view_staff_schedule', 'manage_own_schedule',
      'view_analytics', 'view_reports', 'view_financial_reports', 'all'
    ] as Permission[],
    isSystemRole: true
  },
  manager: {
    name: 'manager' as RoleType,
    description: 'Branch management with staff oversight and reporting access',
    permissions: [
      'view_appointments', 'create_appointments', 'cancel_appointments',
      'view_customers', 'create_customers', 'edit_customer_info',
      'view_services', 'view_inventory', 'update_stock',
      'manage_staff_schedule', 'view_staff_schedule', 'manage_own_schedule',
      'view_analytics'
    ] as Permission[],
    isSystemRole: true
  },
  staff: {
    name: 'staff' as RoleType,
    description: 'Basic service provider access with appointment management',
    permissions: [
      'view_appointments', 'create_appointments',
      'view_customers', 'create_customers',
      'view_services', 'view_inventory',
      'manage_own_schedule'
    ] as Permission[],
    isSystemRole: true
  },
  receptionist: {
    name: 'receptionist' as RoleType,
    description: 'Front desk operations with customer and appointment handling',
    permissions: [
      'view_appointments', 'create_appointments',
      'view_customers', 'create_customers',
      'view_services'
    ] as Permission[],
    isSystemRole: true
  }
};

// Initialize Firestore collections
export const rolesCollection = db.collection('roles');
export const usersCollection = db.collection('users');

// Function to ensure role exists in Firestore
async function ensureRoleExists(roleId: string, roleData: typeof DefaultRoles[keyof typeof DefaultRoles]) {
  try {
    const roleRef = rolesCollection.doc(roleId);
    const roleDoc = await roleRef.get();

    if (!roleDoc.exists) {
      console.log(`📝 Creating role: ${roleId}`);
      await roleRef.set({
        ...roleData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } else {
      console.log(`✓ Role ${roleId} exists`);
      // Update permissions if needed
      const existingData = roleDoc.data();
      if (existingData?.isSystemRole) {
        await roleRef.update({
          permissions: roleData.permissions,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }
  } catch (error) {
    console.error(`❌ Error ensuring role ${roleId}:`, error);
    throw error;
  }
}

// Helper function to get role data from Firestore
export async function getRoleFromFirebase(roleName: RoleType) {
  console.log(`🔍 Fetching role data for: ${roleName}`);
  try {
    const roleDoc = await db.collection('roles').doc(roleName).get();
    if (!roleDoc.exists) {
      console.log(`Role ${roleName} not found in Firestore, using default role definition`);
      return DefaultRoles[roleName];
    }
    return roleDoc.data() as {
      name: RoleType;
      description: string;
      permissions: Permission[];
    };
  } catch (error) {
    console.error(`❌ Error fetching role ${roleName}:`, error);
    // Fallback to default role definition if Firestore fails
    return DefaultRoles[roleName];
  }
}

// Initialize roles in Firebase Firestore
export async function initializeRoles() {
  console.log('🔄 Initializing roles in Firebase...');
  
  try {
    // Initialize all default roles
    const initPromises = Object.entries(DefaultRoles).map(([roleId, roleData]) => 
      ensureRoleExists(roleId, roleData)
    );
    await Promise.all(initPromises);
    
    // Verify roles
    const rolesSnapshot = await rolesCollection.get();
    const actualRoles = rolesSnapshot.docs.map(doc => doc.id);
    
    console.log('✅ Roles initialized:', actualRoles);
    console.log(`📊 Total roles in system: ${rolesSnapshot.size}`);
    
    if (rolesSnapshot.size !== Object.keys(DefaultRoles).length) {
      console.warn('⚠️ Mismatch in number of roles');
      console.warn('Expected:', Object.keys(DefaultRoles).length);
      console.warn('Actual:', rolesSnapshot.size);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error initializing roles:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack trace:', error.stack);
    }
    throw error;
  }
}

// Function to get role data from Firestore
export async function getRoleFromFirebase(roleName: RoleType): Promise<{
  name: RoleType;
  description: string;
  permissions: Permission[];
}> {
  try {
    const roleDoc = await rolesCollection.doc(roleName).get();
    
    if (!roleDoc.exists) {
      console.log(`Role ${roleName} not found in Firestore, using default`);
      return DefaultRoles[roleName];
    }
    
    const roleData = roleDoc.data();
    return {
      name: roleData!.name,
      description: roleData!.description,
      permissions: roleData!.permissions,
    };
  } catch (error) {
    console.error(`Error fetching role ${roleName}:`, error);
    return DefaultRoles[roleName];
  }
}

// Function to update user's role in both Auth and Firestore
export async function updateUserRole(uid: string, role: RoleType) {
  console.log(`🔄 Updating role for user ${uid} to ${role}`);
  try {
    const roleData = await getRoleFromFirebase(role);
    
    // Update custom claims in Firebase Auth
    await admin.auth().setCustomUserClaims(uid, {
      role: roleData.name,
      permissions: roleData.permissions,
      updatedAt: new Date().toISOString()
    });

    // Update user document in Firestore
    await usersCollection.doc(uid).set({
      role: roleData.name,
      permissions: roleData.permissions,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    // Force token refresh
    await admin.auth().revokeRefreshTokens(uid);

    console.log(`✅ Successfully updated role for user ${uid}`);
    return roleData;
  } catch (error) {
    console.error(`❌ Error updating role for user ${uid}:`, error);
    throw error;
  }
}

// Function to sync user roles between Auth and Firestore
export async function syncUserRoles() {
  console.log('🔄 Starting user role synchronization...');
  try {
    const listUsersResult = await admin.auth().listUsers();
    
    for (const userRecord of listUsersResult.users) {
      const customClaims = userRecord.customClaims || {};
      const userRole = (customClaims.role as RoleType) || 'staff';
      
      // Update user's role and permissions
      await updateUserRole(userRecord.uid, userRole);
    }
    
    console.log('✅ User role synchronization completed');
    return true;
  } catch (error) {
    console.error('❌ Error syncing user roles:', error);
    throw error;
  }
}

// Initialize roles when the module loads
(async () => {
  try {
    await initializeRoles();
    console.log('✅ Role system initialized');
  } catch (error) {
    console.error('❌ Error initializing role system:', error);
    if (process.env.NODE_ENV !== 'development') {
      process.exit(1);
    }
  }
})();

  // Function to update user's role and permissions in Firestore
export async function updateUserRoleInFirestore(uid: string, role: RoleType) {
  console.log(`🔄 Updating role for user ${uid} to ${role} in Firestore`);
  try {
    const roleData = await getRoleFromFirebase(role);
    
    // Update user document in Firestore with role information
    await db.collection('users').doc(uid).set({
      role: roleData.name,
      permissions: roleData.permissions,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    console.log(`✅ Successfully updated role in Firestore for user ${uid}`);
    return roleData;
  } catch (error) {
    console.error(`❌ Error updating role in Firestore for user ${uid}:`, error);
    throw error;
  }
}

// Function to sync roles between Auth custom claims and Firestore
export async function syncUserRoles() {
  console.log('🔄 Starting user role synchronization...');
  try {
    const listUsersResult = await admin.auth().listUsers();
    
    for (const userRecord of listUsersResult.users) {
      const customClaims = userRecord.customClaims || {};
      const userRole = (customClaims.role as RoleType) || 'staff';
      
      // Ensure user exists in Firestore with correct role
      await updateUserRoleInFirestore(userRecord.uid, userRole);
    }
    
    console.log('✅ User role synchronization completed');
    return true;
  } catch (error) {
    console.error('❌ Error syncing user roles:', error);
    throw error;
  }
}

// Function to update user's role in Firebase
export async function updateUserRole(uid: string, role: RoleType) {
  console.log(`🔄 Updating role for user ${uid} to ${role}`);
  try {
    const roleData = await getRoleFromFirebase(role);
    
    // Update custom claims in Firebase Auth
    await admin.auth().setCustomUserClaims(uid, {
      role: roleData.name,
      permissions: roleData.permissions,
      updatedAt: new Date().toISOString()
    });

    // Update user document in Firestore
    await db.collection('users').doc(uid).set({
      role: roleData.name,
      permissions: roleData.permissions,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    console.log(`✅ Successfully updated role for user ${uid}`);
    return roleData;
  } catch (error) {
    console.error(`❌ Error updating role for user ${uid}:`, error);
    throw error;
  }
}

// Function to fetch all users with their roles
export async function getAllUsersWithRoles(maxResults = 1000) {
  console.log('🔍 Fetching all users with roles...');
  try {
    const listUsersResult = await admin.auth().listUsers(maxResults);
    const users = await Promise.all(
      listUsersResult.users.map(async (userRecord) => {
        const userDoc = await db.collection('users').doc(userRecord.uid).get();
        const userData = userDoc.exists ? userDoc.data() : null;
        
        return {
          uid: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName,
          role: userData?.role || userRecord.customClaims?.role || 'staff',
          permissions: userData?.permissions || userRecord.customClaims?.permissions || [],
          disabled: userRecord.disabled,
          lastSignInTime: userRecord.metadata.lastSignInTime,
          creationTime: userRecord.metadata.creationTime
        };
      })
    );
    
    console.log(`✅ Successfully fetched ${users.length} users`);
    return users;
  } catch (error) {
    console.error('❌ Error fetching users:', error);
    throw error;
  }
}

export { firebaseAdmin };
export default firebaseAdmin;
