
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';

export interface Bill {
  id: string;
  appointmentId: string;
  customerId: string;
  customerName: string;
  date: string;
  items: {
    name: string;
    price: number;
    quantity: number;
  }[];
  subtotal: number;
  tax: number;
  total: number;
  status: BillStatus;
}

type BillStatus = 'PENDING_PAYMENT' | 'PAID' | 'CANCELED' | 'REFUNDED';

const statusColors: Record<BillStatus, string> = {
  'PENDING_PAYMENT': 'bg-amber-100 text-amber-800',
  'PAID': 'bg-green-100 text-green-800',
  'CANCELED': 'bg-gray-100 text-gray-800',
  'REFUNDED': 'bg-red-100 text-red-800'
};

function BillCard({ bill }: { bill: Bill }) {
  const navigate = useNavigate();

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-medium">Invoice #{bill.id.slice(0, 8)}</CardTitle>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[bill.status]}`}>
            {bill.status}
          </span>
        </div>
        <div className="text-sm text-gray-500">{new Date(bill.date).toLocaleDateString()}</div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="text-sm">
            <span className="font-medium">Customer: </span>
            {bill.customerName}
          </div>
          <div className="text-sm">
            <span className="font-medium">Items: </span>
            {bill.items.length}
          </div>
          <div className="text-lg font-bold mt-2">
            Total: {formatCurrency(bill.total)}
          </div>
          <Button 
            className="w-full mt-2" 
            onClick={() => navigate(`/billing/${bill.id}`)}
          >
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function BillingPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<BillStatus | 'ALL'>('ALL');

  useEffect(() => {
    async function fetchBills() {
      try {
        const response = await fetch('/api/billing/bills');
        const data = await response.json();
        setBills(data);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch bills', error);
        setLoading(false);
      }
    }

    fetchBills();
  }, []);

  const filteredBills = filter === 'ALL' 
    ? bills 
    : bills.filter(bill => bill.status === filter);

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Bills</h1>
          <div className="h-8 w-40"><Skeleton className="h-full w-full" /></div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="pb-2">
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-6 w-24 mt-2" />
                  <Skeleton className="h-10 w-full mt-2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
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
  );
}
