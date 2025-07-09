import { useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { format } from 'date-fns';
import { ArrowLeft, Download, CreditCard, User, Calendar, Clock, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { formatIndianCurrency } from '@/lib/utils';
import { Bill } from '@/types/billing';
import { Separator } from '@/components/ui/separator';
import { useFirebaseAuth } from '@/hooks/use-firebase-auth';
import { useUser } from '@/hooks/use-user';

interface BillDetailsPageProps {
  billId?: string;
}

export default function BillDetailsPage({ billId: propBillId }: BillDetailsPageProps) {
  const [, setLocation] = useLocation();
  const [matched, params] = useRoute('/billing/:id');
  const billId = params?.id || propBillId;
  const { getIdToken } = useFirebaseAuth();
  const { user } = useUser();

  // Redirect if no billId
  useEffect(() => {
    if (!billId) {
      setLocation('/billing');
    }
  }, [billId, setLocation]);

  // Fetch bill data with React Query
  const {
    data: bill,
    isLoading: loading,
    error,
    isError
  } = useQuery<Bill | null>({
    queryKey: ['bill', billId],
    queryFn: async () => {
      if (!billId || !user) return null;

      const idToken = await getIdToken();
      const apiBaseUrl = import.meta.env.VITE_API_URL || '';
      
      console.log('[BILLING] Fetching bill by ID:', billId);
      const response = await fetch(`${apiBaseUrl}/api/billing/bills/${billId}`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Bill not found');
        }
        throw new Error(`Failed to fetch bill: ${response.status}`);
      }

      const billData = await response.json();
      console.log('[BILLING] Successfully fetched bill:', billData.id);
      return billData;
    },
    enabled: !!billId && !!user,
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: false,
  });

  const handleGoBack = () => {
    setLocation('/billing');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-100 text-green-800';
      case 'PENDING_PAYMENT':
        return 'bg-yellow-100 text-yellow-800';
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800';
      case 'CANCELED':
        return 'bg-red-100 text-red-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      case 'REFUNDED':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING_PAYMENT':
        return 'Pending Payment';
      case 'PAID':
        return 'Paid';
      case 'DRAFT':
        return 'Draft';
      case 'CANCELED':
        return 'Canceled';
      case 'FAILED':
        return 'Failed';
      case 'REFUNDED':
        return 'Refunded';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Card>
          <CardHeader>
            <div className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !bill) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="sm" onClick={handleGoBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Bills
          </Button>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {error instanceof Error ? error.message : error || 'Bill not found'}
            </p>
            <Button variant="outline" className="mt-4" onClick={handleGoBack}>
              Return to Bills
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={handleGoBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Bills
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Bill Details</h1>
            <p className="text-muted-foreground">
              {bill.billNumber}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getStatusColor(bill.status)}>
            {getStatusLabel(bill.status)}
          </Badge>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Bill Details Card */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">Invoice #{bill.billNumber}</h2>
              <p className="text-sm text-muted-foreground">
                Created on {format(new Date(bill.createdAt), 'PPP')}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">
                {formatIndianCurrency(bill.totalAmount)}
              </p>
              <p className="text-sm text-muted-foreground">
                Total Amount
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Customer & Billing Info */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <User className="h-4 w-4" />
                Customer Details
              </h3>
              <div className="space-y-1">
                <p className="font-medium">{bill.customerName || 'Unknown Customer'}</p>
                <p className="text-sm text-muted-foreground">
                  Customer ID: {bill.customerId}
                </p>
                {bill.billingAddress && (
                  <p className="text-sm text-muted-foreground">
                    {typeof bill.billingAddress === 'string' 
                      ? bill.billingAddress 
                      : JSON.stringify(bill.billingAddress)}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Appointment Details
              </h3>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  Appointment ID: {bill.appointmentId}
                </p>
                {bill.petId && (
                  <p className="text-sm text-muted-foreground">
                    Pet ID: {bill.petId}
                  </p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Services */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Services & Items
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Service</th>
                    <th className="text-right py-2">Qty</th>
                    <th className="text-right py-2">Price</th>
                    <th className="text-right py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {bill.items.map((item, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-2">
                        <div>
                          <p className="font-medium">{item.serviceName}</p>
                          {item.description && (
                            <p className="text-sm text-muted-foreground">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="text-right py-2">{item.quantity}</td>
                      <td className="text-right py-2">
                        {formatIndianCurrency(item.price)}
                      </td>
                      <td className="text-right py-2 font-medium">
                        {formatIndianCurrency(item.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <Separator />

          {/* Pricing Breakdown */}
          <div className="space-y-3">
            <h3 className="font-semibold">Pricing Breakdown</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatIndianCurrency(bill.subtotal)}</span>
              </div>
              
              {bill.discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount:</span>
                  <span>-{formatIndianCurrency(bill.discountAmount)}</span>
                </div>
              )}

              {bill.gstDetails && bill.gstDetails.totalGST > 0 && (
                <>
                  {bill.gstDetails.cgst > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>CGST:</span>
                      <span>{formatIndianCurrency(bill.gstDetails.cgst)}</span>
                    </div>
                  )}
                  {bill.gstDetails.sgst > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>SGST:</span>
                      <span>{formatIndianCurrency(bill.gstDetails.sgst)}</span>
                    </div>
                  )}
                  {bill.gstDetails.igst > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>IGST:</span>
                      <span>{formatIndianCurrency(bill.gstDetails.igst)}</span>
                    </div>
                  )}
                </>
              )}

              <Separator />
              
              <div className="flex justify-between text-lg font-semibold">
                <span>Total Amount:</span>
                <span>{formatIndianCurrency(bill.totalAmount)}</span>
              </div>
            </div>
          </div>

          {bill.notes && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="font-semibold">Notes</h3>
                <p className="text-sm text-muted-foreground">{bill.notes}</p>
              </div>
            </>
          )}
        </CardContent>

        {bill.status === 'PENDING_PAYMENT' && (
          <CardFooter>
            <Button className="w-full">
              <CreditCard className="h-4 w-4 mr-2" />
              Pay Now
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}