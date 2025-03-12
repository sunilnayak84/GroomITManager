import { useEffect, useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import { format } from 'date-fns';
import { ArrowLeft, Download, CreditCard, User, Calendar, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useBilling } from '@/hooks/use-billing';
import { formatIndianCurrency } from '@/lib/utils';
import { Bill } from '@/types/billing';
import { Separator } from '@/components/ui/separator';

interface BillDetailsPageProps {
  billId?: string;
}

export default function BillDetailsPage({ billId: propBillId }: BillDetailsPageProps) {
  const [location] = useLocation();
  // Use the prop billId if provided, otherwise extract from URL
  //const billId = propBillId || location.split('/').pop();
  const [matched, params] = useRoute('/billing/:id');
  const billId = params?.id || propBillId;
  const [loading, setLoading] = useState(true);
  const [bill, setBill] = useState<Bill | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, navigate] = useLocation();
  const { getBillById, isLoading } = useBilling();

  useEffect(() => {
    const fetchBill = async () => {
      if (!params?.id) {
        setLocation('/billing');
        return;
      }

      setLoading(true);
      try {
        console.log('[BILLING] Fetching bill with ID:', params.id);
        const billData = await getBillById(params.id);
        if (!billData) {
          console.error('[BILLING] Bill not found:', params.id);
          setLocation('/billing');
          return;
        }
        setBill(billData);
      } catch (error) {
        console.error('[BILLING] Error fetching bill:', error);
        setLocation('/billing');
      } finally {
        setLoading(false);
      }
    };

    fetchBill();
  }, [params?.id, getBillById, setLocation]);

  // Format date if available
  const formattedDate = bill?.createdAt ? 
    (() => {
      try {
        const dateObj = new Date(bill.createdAt);
        return !isNaN(dateObj.getTime()) ? format(dateObj, 'dd MMM yyyy') : 'Invalid Date';
      } catch (error) {
        return 'Invalid Date';
      }
    })() : 'N/A';

  // Define status color mapping
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'PAID': return 'bg-green-100 text-green-800';
      case 'PENDING_PAYMENT': return 'bg-yellow-100 text-yellow-800';
      case 'CANCELED': return 'bg-gray-100 text-gray-800';
      case 'REFUNDED': return 'bg-blue-100 text-blue-800';
      case 'FAILED': return 'bg-red-100 text-red-800';
      default: return '';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            <Skeleton className="h-4 w-16" />
          </Button>
        </div>
        <Card>
          <CardHeader>
            <div className="flex justify-between">
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-6 w-24" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <div className="mt-6">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full mt-2" />
                <Skeleton className="h-6 w-full mt-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/billing')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Bills
          </Button>
        </div>
        <Card className="text-center p-6">
          <h2 className="text-xl font-semibold mb-2">Bill Not Found</h2>
          <p className="text-muted-foreground">The bill you're looking for doesn't exist or has been removed.</p>
          <Button className="mt-4" onClick={() => navigate('/billing')}>
            Return to Billing
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/billing')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Bills
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold">Invoice #{bill.id?.slice(0, 8)}</h1>
              <p className="text-muted-foreground">{formattedDate}</p>
            </div>
            <Badge className={`px-3 py-1.5 text-sm ${getStatusColor(bill.status)}`}>
              {bill.status}
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between gap-6">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Customer</h3>
                <div className="flex items-center gap-1.5">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{bill.customerId || 'N/A'}</span>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Date</h3>
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{formattedDate}</span>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Type</h3>
                <div className="flex items-center gap-1.5">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <span>Standard Invoice</span>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-medium mb-3">Items</h3>
              <div className="space-y-2">
                {bill.items && bill.items.length > 0 ? (
                  bill.items.map((item, index) => (
                    <div key={index} className="flex justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="font-medium">{item.serviceName || 'Service'}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.quantity} x {formatIndianCurrency(item.price || 0)}
                        </p>
                      </div>
                      <p className="font-medium">{formatIndianCurrency(item.subtotal || 0)}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground">No items in this bill</p>
                )}
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatIndianCurrency(bill.subtotal || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax:</span>
                <span>{formatIndianCurrency(bill.tax || 0)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2">
                <span>Total:</span>
                <span>{formatIndianCurrency(bill.totalAmount || 0)}</span>
              </div>
            </div>

            {bill.paymentLink && (
              <div className="border rounded-md p-4 bg-gray-50 mt-4">
                <div className="flex items-center text-sm">
                  <CreditCard className="mr-2 h-4 w-4 text-gray-500" />
                  <span>Online Payment:</span>
                  <a 
                    href={bill.paymentLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="ml-2 text-blue-600 underline truncate flex-1"
                  >
                    {bill.paymentLink}
                  </a>
                </div>
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-wrap gap-2 justify-end">
          {bill.paymentLink && bill.status === 'PENDING_PAYMENT' && (
            <Button onClick={() => window.open(bill.paymentLink, '_blank')} className="bg-green-600 hover:bg-green-700">
              <CreditCard className="mr-2 h-4 w-4" />
              Pay Now
            </Button>
          )}
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Download Invoice
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}