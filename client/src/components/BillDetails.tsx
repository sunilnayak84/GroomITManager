import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface BillDetailsProps {
  appointmentId: string;
}

export function BillDetails({ appointmentId }: BillDetailsProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerateBill = async () => {
    try {
      setLoading(true);
      
      // First debug the appointment to help with troubleshooting
      console.log('[BILLING] Getting details for appointment:', appointmentId);
      const debugResponse = await fetch(`/api/debug/appointment/${appointmentId}`, {
        method: 'GET'
      });
      
      if (debugResponse.ok) {
        const debugData = await debugResponse.json();
        console.log('[BILLING] Appointment debug data:', debugData);
      } else {
        console.error('[BILLING] Failed to debug appointment');
      }
      
      // Generate the bill
      const response = await fetch(`/api/billing/generate/${appointmentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        let errorMessage = 'Failed to generate bill';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
          console.error('[BILLING] Bill generation error:', errorData);
        } catch (err) {
          console.error('[BILLING] Error parsing error response:', err);
        }
        throw new Error(errorMessage);
      }

      const bill = await response.json();

      if (bill.paymentLink) {
        window.open(bill.paymentLink, '_blank');
      }
    } catch (error) {
      console.error('Error generating bill:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate bill",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate Bill</CardTitle>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={handleGenerateBill} 
          disabled={loading}
          className="w-full"
        >
          {loading ? "Generating..." : "Generate Bill"}
        </Button>
      </CardContent>
    </Card>
  );
}