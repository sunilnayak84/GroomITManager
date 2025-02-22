import { useState, useCallback } from 'react';
import { Bill, BillDraft } from '@/types/billing';
import { useToast } from './use-toast';

interface UseBillingOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useBilling(options: UseBillingOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [bills, setBills] = useState<Bill[]>([]);
  const { toast } = useToast();

  const generateBill = useCallback(async (appointmentId: string, draft: BillDraft) => {
    setIsLoading(true);
    try {
      console.log('[BILLING] Generating bill for:', appointmentId);
      const response = await fetch(`/api/billing/generate/${appointmentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(draft),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate bill');
      }

      const bill = await response.json();
      setBills(prev => [...prev, bill]);

      toast({
        title: "Success",
        description: "Bill generated successfully",
      });

      options.onSuccess?.();
      return bill;
    } catch (error) {
      console.error('[BILLING] Error generating bill:', error);
      const message = error instanceof Error ? error.message : 'Failed to generate bill';
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      options.onError?.(error instanceof Error ? error : new Error(message));
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [toast, options]);

  const getBills = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log('[BILLING] Fetching bills');
      const response = await fetch('/api/billing/bills');
      if (!response.ok) {
        throw new Error('Failed to fetch bills');
      }
      const data = await response.json();
      console.log('[BILLING] Fetched bills:', data);
      setBills(data);
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

  const verifyPayment = useCallback(async (paymentId: string) => {
    try {
      console.log('[BILLING] Verifying payment:', paymentId);
      const response = await fetch('/api/billing/verify-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentId }),
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

  return {
    bills,
    isLoading,
    generateBill,
    getBills,
    verifyPayment,
  };
}