/**
 * Clear Billing Data via API
 * 
 * This script uses the existing API to clear all billing data
 */

async function clearBillingData() {
  console.log('🧹 Starting billing data cleanup via API...');
  
  try {
    // First, get all bills
    const response = await fetch('http://localhost:3000/api/billing/bills', {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch bills: ${response.statusText}`);
    }
    
    const bills = await response.json();
    console.log(`📄 Found ${bills.length} bills to delete`);
    
    // Delete each bill
    for (const bill of bills) {
      const deleteResponse = await fetch(`http://localhost:3000/api/billing/bills/${bill.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!deleteResponse.ok) {
        console.warn(`⚠️ Failed to delete bill ${bill.id}: ${deleteResponse.statusText}`);
      } else {
        console.log(`✅ Deleted bill ${bill.id}`);
      }
    }
    
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