
import { useState, useCallback } from 'react';
import { Bill, BillDraft, BillStatus } from '@/types/billing';
import { useToast } from './use-toast';
import { auth } from '@/lib/firebase';

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
      setBills(billsData);
      return billsData;
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
      await getBills();
      
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
      console.log('[BILLING] Fetching bill by ID:', billId);

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
          console.error(`[BILLING] Bill not found for ID: ${billId}`);
          throw new Error(`404: Bill with ID ${billId} not found`);
        }
        throw new Error('Failed to fetch bill');
      }

      const bill = await response.json();
      console.log('[BILLING] Bill fetched successfully:', bill);
      return bill;
    } catch (error) {
      console.error('[BILLING] Error fetching bill by ID:', error);
      toast({
        title: "Error",
        description: (error as Error).message || "Failed to fetch bill",
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
