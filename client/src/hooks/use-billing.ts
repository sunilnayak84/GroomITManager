import { useState, useCallback } from 'react';
import { Bill as BaseBill, BillDraft, BillStatus } from '@/types/billing';

// Extend the Bill type to include petId
export interface Bill extends BaseBill {
  petId?: string;
}
import { useToast } from './use-toast';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/router'; // Added import for useRouter


interface UseBillingOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useBilling(options: UseBillingOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [bills, setBills] = useState<Bill[]>([]);
  const { toast } = useToast();

  const getBills = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log('[BILLING] Fetching bills');

      // Get the current user's ID token
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch('/api/billing/bills', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch bills');
      }

      const billsData = await response.json();
      console.log('[BILLING] Fetched bills:', billsData);
      // Ensure we have consistent date handling
      const processedBills = (billsData || []).map(bill => {
        // If createdAt exists as a timestamp object with toDate method, convert it
        if (bill.createdAt && typeof bill.createdAt.toDate === 'function') {
          return { ...bill, createdAt: bill.createdAt.toDate().toISOString() };
        }
        return bill;
      });
      setBills(processedBills);
      return processedBills;
    } catch (error) {
      console.error('[BILLING] Error fetching bills:', error);
      toast({
        title: "Error",
        description: "Failed to fetch bills",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const generateBill = useCallback(async (appointmentId: string, draft?: BillDraft) => {
    setIsLoading(true);
    try {
      console.log('[BILLING] Generating bill for:', appointmentId);

      // Get the current user's ID token
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      // First debug the appointment to help diagnose issues
      console.log('[BILLING] Debugging appointment before generating bill');
      try {
        const debugResponse = await fetch(`/api/debug/appointment/${appointmentId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (debugResponse.ok) {
          const debugData = await debugResponse.json();
          console.log('[BILLING] Appointment debug data:', debugData);
        }
      } catch (error) {
        console.error('[BILLING] Error debugging appointment:', error);
      }

      const response = await fetch(`/api/billing/generate/${appointmentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: draft ? JSON.stringify(draft) : undefined
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate bill');
      }

      const generatedBill = await response.json();
      console.log('[BILLING] Bill generated successfully:', generatedBill);

      // Refresh bills list
      setTimeout(() => {
        getBills();
      }, 500); //Added setTimeout as per the changes

      if (options.onSuccess) {
        options.onSuccess();
      }

      toast({
        title: "Success",
        description: "Bill generated successfully",
      });

      return generatedBill;
    } catch (error) {
      console.error('[BILLING] Error generating bill:', error);

      if (options.onError) {
        options.onError(error as Error);
      }

      toast({
        title: "Error",
        description: (error as Error).message || "Failed to generate bill",
        variant: "destructive",
      });

      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [toast, options, getBills]);

  const getBillById = useCallback(async (billId: string) => {
    setIsLoading(true);
    try {
      console.log('[BILLING] Fetching bill:', billId);

      // Get the current user's ID token
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`/api/billing/bill/${billId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.error('[BILLING] Bill not found:', billId);
          return null;
        }
        throw new Error('Failed to fetch bill');
      }

      const billData = await response.json();
      console.log('[BILLING] Fetched bill:', billData);

      // Convert dates from strings to Date objects and ensure customer name is present
      const bill: Bill = {
        ...billData,
        createdAt: new Date(billData.createdAt),
        updatedAt: new Date(billData.updatedAt),
        customerName: billData.customerName || billData.customerName === '' ? billData.customerName : 'Unknown Customer'
      };

      console.log('[BILLING] Processed bill data:', { id: bill.id, customer: bill.customerName });
      return bill;
    } catch (error) {
      console.error('[BILLING] Error fetching bill:', error);
      if (error instanceof Error && error.message.startsWith('404')) {
        return null;
      }
      toast({
        title: "Error",
        description: "Failed to fetch bill details",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const verifyPayment = useCallback(async (paymentId: string) => {
    try {
      console.log('[BILLING] Verifying payment for:', paymentId);

      // Get the current user's ID token
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`/api/billing/verify-payment/${paymentId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to verify payment');
      }

      const { success } = await response.json();
      if (success) {
        toast({
          title: "Success",
          description: "Payment verified successfully",
        });
      }
      return success;
    } catch (error) {
      console.error('[BILLING] Error verifying payment:', error);
      toast({
        title: "Error",
        description: "Failed to verify payment",
        variant: "destructive",
      });
      throw error;
    }
  }, [toast]);

  // Function to manually refresh bills
  const refreshBills = useCallback(async () => {
    return await getBills();
  }, [getBills]);

  return {
    bills,
    isLoading,
    generateBill,
    getBills,
    refreshBills,
    verifyPayment,
    getBillById
  };
}

// Added useBillingOperations hook based on the changes provided.  Assumes getToken() exists.
export const useBillingOperations = () => {
  const { showToast } = useToast();
  const router = useRouter();

  const generateBill = async (appointmentId: string): Promise<string | null> => {
    try {
      console.log('[BILLING] Initiating bill generation for appointment:', appointmentId);

      const response = await fetch(`/api/billing/generate/${appointmentId}`, { // Removed import.meta.env.VITE_API_URL - assuming it's handled elsewhere
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getToken()}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate bill');
      }

      const { billId } = await response.json();
      console.log('[BILLING] Bill successfully generated with ID:', billId);

      showToast({
        title: 'Bill Generated',
        description: 'The bill has been successfully generated.',
        variant: 'success'
      });

      // Fetch the bill to verify it has the customer name
      try {
        const billResponse = await fetch(`/api/billing/bill/${billId}`, {
          headers: {
            'Authorization': `Bearer ${await getToken()}`
          }
        });

        if (billResponse.ok) {
          const billData = await billResponse.json();
          console.log('[BILLING] Verification - Bill data retrieved:', billData);

          if (!billData.customerName || billData.customerName === 'Unknown Customer') {
            console.warn('[BILLING] Bill created but customer name might be missing:', billData.customerName);
          }
        }
      } catch (verifyError) {
        console.error('[BILLING] Error verifying generated bill:', verifyError);
      }

      return billId;
    } catch (error) {
      console.error('Error generating bill:', error);
      showToast({
        title: 'Error',
        description: error.message || 'Failed to generate bill',
        variant: 'destructive'
      });
      return null;
    }
  };
  return { generateBill };
};

// Placeholder for getToken - replace with actual implementation
const getToken = async () => {
  // Implement your token retrieval logic here
  // Example:  return await firebase.auth().currentUser.getIdToken();
  return 'YOUR_TOKEN_HERE'; // Replace with your actual token retrieval
};