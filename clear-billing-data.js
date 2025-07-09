/**
 * Clear Billing Data Script
 * 
 * This script removes all billing-related test data from Firestore
 */

import admin from 'firebase-admin';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin
if (!admin.apps.length) {
  // Read service account from file
  const serviceAccountPath = join(__dirname, 'serviceAccount.json');
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id
  });
}

const db = admin.firestore();

async function clearBillingData() {
  console.log('🧹 Starting billing data cleanup...');
  
  try {
    // Get all bills
    const billsSnapshot = await db.collection('bills').get();
    console.log(`📄 Found ${billsSnapshot.size} bills to delete`);
    
    // Delete all bills
    const billDeletePromises = billsSnapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(billDeletePromises);
    
    console.log('✅ All bills deleted successfully');
    
    // Also clear any bill-related data from appointments (reset payment status)
    const appointmentsSnapshot = await db.collection('appointments').where('paymentStatus', '!=', 'pending').get();
    console.log(`📅 Found ${appointmentsSnapshot.size} appointments with payment status to reset`);
    
    const appointmentUpdatePromises = appointmentsSnapshot.docs.map(doc => 
      doc.ref.update({
        paymentStatus: 'pending',
        billId: admin.firestore.FieldValue.delete()
      })
    );
    await Promise.all(appointmentUpdatePromises);
    
    console.log('✅ All appointment payment statuses reset to pending');
    console.log('🎉 Billing data cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error clearing billing data:', error);
    throw error;
  }
}

// Run the cleanup
clearBillingData()
  .then(() => {
    console.log('✨ Cleanup script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Cleanup script failed:', error);
    process.exit(1);
  });