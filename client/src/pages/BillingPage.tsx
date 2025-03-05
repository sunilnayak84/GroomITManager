import { useEffect, useState } from 'react';
import { useNavigate, BrowserRouter as Router } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useBilling } from '@/hooks/use-billing';
import { Bill, BillStatus } from '@/types/billing';

const statusColors: Record<BillStatus, string> = {
  DRAFT: 'bg-gray-500',
  PENDING_PAYMENT: 'bg-yellow-500',
  PAID: 'bg-green-500',
  FAILED: 'bg-red-500'
};

function BillCard({ bill }: { bill: Bill }) {
  const navigate = useNavigate();

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Bill #{bill.id?.slice(0, 8)}</CardTitle>
          <Badge className={statusColors[bill.status]}>
            {bill.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            {bill.items.map((item, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span>{item.serviceName}</span>
                <span>₹{item.price}</span>
              </div>
            ))}
          </div>

          <div className="border-t pt-2 space-y-1">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>₹{bill.subtotal}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Tax</span>
              <span>₹{bill.tax}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Total</span>
              <span>₹{bill.totalAmount}</span>
            </div>
          </div>

          {bill.status === 'PENDING_PAYMENT' && bill.paymentLink && (
            <Button 
              className="w-full"
              onClick={() => window.open(bill.paymentLink, '_blank')}
            >
              Pay Now
            </Button>
          )}

          {bill.status === 'PAID' && (
            <div className="text-center text-green-600">
              Paid Successfully
            </div>
          )}

          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate(`/appointments/${bill.appointmentId}`)}
          >
            View Appointment
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingCard() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-8 w-1/3" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <div className="border-t pt-2">
            <Skeleton className="h-6 w-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function BillingPage() {
  const [filter, setFilter] = useState<BillStatus | 'ALL'>('ALL');
  const { bills, isLoading, getBills } = useBilling();

  useEffect(() => {
    getBills();
  }, [getBills]);

  const filteredBills = bills.filter(bill => 
    filter === 'ALL' ? true : bill.status === filter
  );

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <h1 className="text-2xl font-bold mb-6">Bills</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <LoadingCard key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Bills</h1>
          <div className="flex gap-2">
            {['ALL' as const, ...Object.keys(statusColors)].map(status => (
              <Button
                key={status}
                variant={filter === status ? "default" : "outline"}
                onClick={() => setFilter(status as BillStatus | 'ALL')}
                size="sm"
              >
                {status}
              </Button>
            ))}
          </div>
        </div>

        {filteredBills.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No bills found
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredBills.map(bill => (
              <BillCard key={bill.id} bill={bill} />
            ))}
          </div>
        )}
      </div>
    </Router>
  );
}