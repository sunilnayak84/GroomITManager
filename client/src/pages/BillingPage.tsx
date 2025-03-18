import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useBilling } from '../hooks/use-billing';
import { formatIndianCurrency } from '../lib/utils';
import { format } from 'date-fns';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter
} from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { Badge } from '../components/ui/badge';
import { CreditCard, ExternalLink, Calendar, User, Package, Eye } from 'lucide-react';

type BillStatus = 'PENDING_PAYMENT' | 'PAID' | 'CANCELED' | 'REFUNDED';

const statusColors: Record<BillStatus, string> = {
  'PENDING_PAYMENT': 'bg-amber-100 text-amber-800 border-amber-200',
  'PAID': 'bg-green-100 text-green-800 border-green-200',
  'CANCELED': 'bg-gray-100 text-gray-800 border-gray-200',
  'REFUNDED': 'bg-red-100 text-red-800 border-red-200'
};

function BillCard({ bill }: { bill: Bill }) {
  const [, navigate] = useLocation();

  // Safely format the date with error handling and null checks
  let formattedDate = 'Invalid Date';
  try {
    if (bill.createdAt !== null && bill.createdAt !== undefined) {
      const dateObj = new Date(bill.createdAt);
      if (!isNaN(dateObj.getTime())) {
        formattedDate = format(dateObj, 'dd MMM yyyy');
      }
    }
  } catch (error) {
    console.error('Error formatting date:', error);
  }

  const invoiceId = bill.id ? bill.id.slice(0, 8) : 'N/A';

  // Calculate total from items
  const total = bill.items?.reduce((sum, item) => sum + (item.subtotal || 0), 0) || 0;

  // Define status color mapping
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'PAID': return 'bg-green-100 text-green-800';
      case 'PENDING_PAYMENT': return 'bg-yellow-100 text-yellow-800';
      case 'DRAFT': return 'bg-gray-100 text-gray-800';
      case 'FAILED': return 'bg-red-100 text-red-800';
      default: return '';
    }
  };

  const handleViewDetails = () => {
    navigate(`/billing/${bill.id}`);
  };


  return (
    <Card className="overflow-hidden transition-all duration-200 hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-medium flex items-center">
            <span className="truncate">Invoice #{invoiceId}</span>
          </CardTitle>
          <Badge className={`px-2 py-1 font-medium ${getStatusColor(bill.status)}`}>
            {bill.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="space-y-3">
          <div className="flex items-center text-sm gap-1.5 text-muted-foreground">
            <User className="h-4 w-4" />
            <span className="truncate font-medium">Customer: {bill.customerName || bill.customerId || 'Unknown'}</span>
          </div>

          <div className="flex items-center text-sm gap-1.5 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{formattedDate}</span>
          </div>

          <div className="text-xl font-bold mt-4">
            {formatIndianCurrency(bill.totalAmount || total)}
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-3 pb-3">
        <Button 
          variant="outline" 
          className="w-full" 
          onClick={handleViewDetails}
        >
          <Eye className="mr-2 h-4 w-4" />
          View Details
        </Button>
      </CardFooter>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-12 border border-dashed rounded-lg">
      <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
        <CreditCard className="h-6 w-6 text-gray-400" />
      </div>
      <h3 className="mt-4 text-lg font-medium">No bills found</h3>
      <p className="mt-2 text-sm text-gray-500">
        Bills will appear here once they are generated from appointments.
      </p>
    </div>
  );
}

function BillSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-6 w-24" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 py-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-20 mt-2" />
        </div>
      </CardContent>
      <CardFooter className="pt-3 pb-3">
        <Skeleton className="h-9 w-full" />
      </CardFooter>
    </Card>
  );
}

import { Bill } from '@/types/billing';

export default function BillingPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<BillStatus | 'ALL'>('ALL');
  const { bills: hookBills, getBills, isLoading } = useBilling();
  const [, params] = useLocation();

  // Get query parameters (for direct bill opening)
  const queryParams = new URLSearchParams(window.location.search);
  const billId = queryParams.get('billId');

  useEffect(() => {
    const fetchBills = async () => {
      try {
        setLoading(true);
        await getBills();
        // The updated bills will be available from the hookBills

        // If billId is present in query param, redirect to bill details
        if (billId) {
          window.location.href = `/billing/${billId}`;
        }
      } catch (error) {
        console.error('Error fetching bills:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBills();
  }, [getBills, billId]);

  // Use the bills directly from the hook instead
  useEffect(() => {
    if (hookBills && hookBills.length > 0) {
      setBills(hookBills);
    }
  }, [hookBills]);

  const filteredBills = filter === 'ALL' ? bills : (bills || []).filter(bill => bill.status === filter);

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold">Billing & Invoices</h1>
        <div className="flex flex-wrap gap-2">
          {['ALL' as const, ...Object.keys(statusColors) as BillStatus[]].map(status => (
            <Button
              key={status}
              variant={filter === status ? "default" : "outline"}
              onClick={() => setFilter(status as BillStatus | 'ALL')}
              size="sm"
              className={filter === status && status !== 'ALL' ? statusColors[status as BillStatus] : ''}
            >
              {status}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <BillSkeleton key={i} />
          ))}
        </div>
      ) : !filteredBills || filteredBills.length === 0 ? (
        <EmptyState />
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