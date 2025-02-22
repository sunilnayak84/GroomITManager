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
      // Use absolute path to ensure consistent routing
      const response = await fetch(`/api/billing/generate/${appointmentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate bill');
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