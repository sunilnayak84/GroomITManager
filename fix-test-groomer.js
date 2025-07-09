// Direct Firebase Admin fix script to update the Test Groomer user
import admin from 'firebase-admin';

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'replit-5ac6a'
  });
}

async function fixTestGroomer() {
  console.log('🔧 Fixing Test Groomer user data directly...');
  
  try {
    const db = admin.firestore();
    
    // Find the Test Groomer user
    const testGroomerSnapshot = await db.collection('users')
      .where('uid', '==', 'bEWrvBuCjcaS81IPqzBpApXnRyy1')
      .get();
    
    if (testGroomerSnapshot.empty) {
      console.error('❌ Test Groomer user not found');
      return;
    }
    
    const testGroomerDoc = testGroomerSnapshot.docs[0];
    const testGroomerData = testGroomerDoc.data();
    
    console.log('📋 Current Test Groomer data:', {
      id: testGroomerDoc.id,
      name: testGroomerData.name,
      email: testGroomerData.email,
      role: testGroomerData.role
    });
    
    // Update to Siddharth's correct information
    const correctName = 'Siddharth Basodiya';
    const correctEmail = 'siddharth@groomery.in';
    
    await db.collection('users').doc(testGroomerDoc.id).update({
      name: correctName,
      displayName: correctName,
      email: correctEmail,
      isGroomer: true,
      role: 'staff',
      specialties: ['groomer'],
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      fixApplied: true,
      fixDate: admin.firestore.FieldValue.serverTimestamp(),
      fixReason: 'Updated Test Groomer to Siddharth Basodiya'
    });
    
    console.log('✅ Successfully updated Test Groomer to Siddharth Basodiya!');
    console.log('📝 Changes applied:', {
      name: `${testGroomerData.name} → ${correctName}`,
      email: `${testGroomerData.email} → ${correctEmail}`,
      role: `${testGroomerData.role} → staff`,
      isGroomer: `${testGroomerData.isGroomer} → true`
    });
    
  } catch (error) {
    console.error('❌ Error fixing Test Groomer:', error.message);
  }
}

fixTestGroomer();