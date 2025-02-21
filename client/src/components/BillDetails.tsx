
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';

interface BillDetailsProps {
  appointmentId: string;
}

export function BillDetails({ appointmentId }: BillDetailsProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerateBill = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/billing/bills/${appointmentId}`, {
        method: 'POST',
      });
      const bill = await response.json();
      
      if (bill.paymentLink) {
        window.open(bill.paymentLink, '_blank');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate bill",
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
