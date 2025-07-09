/**
 * Script to fix Siddharth Basodiya's groomer name
 * 
 * This script checks and updates Siddharth's name in the users collection
 * to ensure he appears correctly as a groomer in appointments.
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fixSiddharthGroomerName() {
  console.log('🔍 Checking Siddharth Basodiya\'s user document...');
  
  try {
    // First, find Siddharth's user document by email
    const usersCollection = collection(db, 'users');
    const siddharthQuery = query(usersCollection, where('email', '==', 'siddharth@groomery.in'));
    const siddharthSnapshot = await getDocs(siddharthQuery);
    
    if (siddharthSnapshot.empty) {
      console.log('❌ Siddharth Basodiya not found in users collection');
      return;
    }
    
    const siddharthDoc = siddharthSnapshot.docs[0];
    const siddharthData = siddharthDoc.data();
    
    console.log('📋 Current Siddharth data:', {
      id: siddharthDoc.id,
      email: siddharthData.email,
      name: siddharthData.name,
      displayName: siddharthData.displayName,
      role: siddharthData.role
    });
    
    // Check if name needs updating
    const correctName = 'Siddharth Basodiya';
    if (siddharthData.name !== correctName) {
      console.log(`🔧 Updating name from "${siddharthData.name}" to "${correctName}"`);
      
      await updateDoc(doc(db, 'users', siddharthDoc.id), {
        name: correctName,
        displayName: correctName,
        updatedAt: new Date()
      });
      
      console.log('✅ Siddharth\'s name updated successfully');
    } else {
      console.log('✅ Siddharth\'s name is already correct');
    }
    
    // Check for appointments with Siddharth as groomer
    console.log('🔍 Checking appointments with Siddharth as groomer...');
    const appointmentsCollection = collection(db, 'appointments');
    const appointmentsQuery = query(appointmentsCollection, where('groomerId', '==', siddharthDoc.id));
    const appointmentsSnapshot = await getDocs(appointmentsQuery);
    
    console.log(`📊 Found ${appointmentsSnapshot.size} appointments with Siddharth as groomer`);
    
    if (appointmentsSnapshot.size > 0) {
      console.log('🔍 Sample appointment details:');
      const sampleDoc = appointmentsSnapshot.docs[0];
      const sampleData = sampleDoc.data();
      console.log({
        appointmentId: sampleDoc.id,
        groomerId: sampleData.groomerId,
        date: sampleData.date?.toDate?.() || sampleData.date,
        status: sampleData.status
      });
    }
    
  } catch (error) {
    console.error('❌ Error fixing Siddharth groomer name:', error);
  }
}

// Run the function
fixSiddharthGroomerName()
  .then(() => {
    console.log('🎉 Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });