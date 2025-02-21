
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface Bill {
  appointmentId: string;
  customerId: string;
  items: {
    serviceName: string;
    price: number;
    quantity: number;
  }[];
  totalAmount: number;
  status: 'pending' | 'paid' | 'failed';
  paymentLink?: string;
}

export default function BillingPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    try {
      const response = await fetch('/api/billing/bills');
      const data = await response.json();
      setBills(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch bills",
        variant: "destructive",
      });
    }
  };

  const handlePayment = (paymentLink: string) => {
    window.open(paymentLink, '_blank');
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Bills</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {bills.map((bill) => (
          <Card key={bill.appointmentId}>
            <CardHeader>
              <CardTitle>Bill #{bill.appointmentId.slice(0, 8)}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {bill.items.map((item, index) => (
                  <div key={index} className="flex justify-between">
                    <span>{item.serviceName}</span>
                    <span>₹{item.price}</span>
                  </div>
                ))}
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span>₹{bill.totalAmount}</span>
                  </div>
                </div>
                {bill.status === 'pending' && bill.paymentLink && (
                  <Button 
                    className="w-full mt-4"
                    onClick={() => handlePayment(bill.paymentLink!)}
                  >
                    Pay Now
                  </Button>
                )}
                {bill.status === 'paid' && (
                  <div className="text-green-600 text-center mt-4">Paid</div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
