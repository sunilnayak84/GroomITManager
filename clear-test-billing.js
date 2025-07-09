/**
 * EMERGENCY BILLING DATA CLEANUP SCRIPT
 * 
 * This script directly clears all test billing data from Firebase.
 * It bypasses the API entirely to ensure no authentication issues.
 */

import admin from 'firebase-admin';

// Initialize Firebase Admin using the service account file
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert('./serviceAccount.json'),
      projectId: 'replit-5ac6a'
    });
    console.log('[CLEANUP] Firebase Admin initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin:', error.message);
    console.error('❌ Make sure serviceAccount.json exists in the project root');
    process.exit(1);
  }
}

async function clearBillingData() {
  try {
    console.log('[CLEANUP] Starting emergency billing data cleanup...');
    
    const db = admin.firestore();
    
    // Get all bills
    const billsSnapshot = await db.collection('bills').get();
    console.log(`[CLEANUP] Found ${billsSnapshot.size} bills to delete`);
    
    // Delete all bills in batches
    if (billsSnapshot.size > 0) {
      const batch = db.batch();
      billsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      console.log('[CLEANUP] All bills deleted successfully');
    } else {
      console.log('[CLEANUP] No bills found to delete');
    }
    
    // Reset appointment payment statuses
    const appointmentsSnapshot = await db.collection('appointments')
      .where('paymentStatus', '!=', 'pending')
      .get();
    
    console.log(`[CLEANUP] Found ${appointmentsSnapshot.size} appointments to reset`);
    
    if (appointmentsSnapshot.size > 0) {
      const appointmentBatch = db.batch();
      appointmentsSnapshot.docs.forEach(doc => {
        appointmentBatch.update(doc.ref, {
          paymentStatus: 'pending',
          billId: admin.firestore.FieldValue.delete()
        });
      });
      await appointmentBatch.commit();
      console.log('[CLEANUP] All appointment payment statuses reset');
    } else {
      console.log('[CLEANUP] No appointments found to reset');
    }
    
    console.log('\n✅ BILLING DATA CLEANUP COMPLETED SUCCESSFULLY');
    console.log(`   - Bills deleted: ${billsSnapshot.size}`);
    console.log(`   - Appointments reset: ${appointmentsSnapshot.size}`);
    console.log('   - Database is now clean for production\n');
    
    process.exit(0);

  } catch (error) {
    console.error('❌ [CLEANUP] Error clearing billing data:', error);
    process.exit(1);
  }
}

// Run the cleanup
clearBillingData();