import { useEffect, useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import { format } from 'date-fns';
import { ArrowLeft, Download, CreditCard, User, Calendar, Clock, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useBilling } from '@/hooks/use-billing';
import { formatIndianCurrency } from '@/lib/utils';
import { Bill } from '@/types/billing';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/use-auth'; // Import useAuth
import { useFirebaseAuth } from '@/hooks/use-firebase-auth'; //Import useFirebaseAuth
import { db } from '@/lib/firebase'; // Assuming firebase import
import { doc, getDoc } from 'firebase/firestore'; // Assuming firebase imports


interface BillDetailsPageProps {
  billId?: string;
}

export default function BillDetailsPage({ billId: propBillId }: BillDetailsPageProps) {
  const [location, setLocation] = useLocation();
  const [matched, params] = useRoute('/billing/:id');
  const billId = params?.id || propBillId;
  const [loading, setLoading] = useState<boolean>(true);
  const [bill, setBill] = useState<Bill | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, navigate] = useLocation();
  const { getBillById, isLoading } = useBilling();
  const { user } = useAuth();
  const { getIdToken } = useFirebaseAuth();

  // Define types for nested objects to avoid TypeScript errors
  type CustomerData = {
    id?: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
  };

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

        // Handle the bill data
        if (billData && billData.customerId) {
          console.log('[BILLING] Bill data loaded, checking customer details:', billData);

          // Always attempt to get the latest customer details
          try {
            const fetchCustomer = async () => {
              // First try with the customerId from the bill
              let response = await fetch(`/api/customers/${billData.customerId}`, {
                headers: {
                  'Authorization': `Bearer ${await getIdToken()}`
                }
              });

              let customerData = null;

              if (response.ok) {
                customerData = await response.json();
                const customerName = customerData.name || `${customerData.firstName || ''} ${customerData.lastName || ''}`.trim();

                // If we got a placeholder name like "Sam Smith", try the pet's owner instead
                if (customerName === 'Sam Smith' && billData.customerId) {
                  console.log('[BILLING] Got placeholder name, trying pet owner instead:', billData.customerId);
                  const petOwnerResponse = await fetch(`/api/customers/${billData.customerId}`, {
                    headers: {
                      'Authorization': `Bearer ${await getIdToken()}`
                    }
                  });

                  if (petOwnerResponse.ok) {
                    const petOwnerData = await petOwnerResponse.json();
                    const petOwnerName = petOwnerData.name || 
                      `${petOwnerData.firstName || ''} ${petOwnerData.lastName || ''}`.trim();

                    if (petOwnerName && petOwnerName !== 'Sam Smith') {
                      console.log('[BILLING] Using pet owner name instead:', petOwnerName);
                      customerData = petOwnerData;
                    }
                  }
                }

                console.log('[BILLING] Final customer data:', customerData);
                billData.customerName = customerData.name || `${customerData.firstName || ''} ${customerData.lastName || ''}`.trim();

              } else if (billData.customerId) {
                // If initial customer lookup failed, try pet owner
                console.log('[BILLING] First lookup failed, trying pet owner:', billData.customerId);
                const petOwnerResponse = await fetch(`/api/customers/${billData.customerId}`, {
                  headers: {
                    'Authorization': `Bearer ${await getIdToken()}`
                  }
                });

                if (petOwnerResponse.ok) {
                  customerData = await petOwnerResponse.json();
                  console.log('[BILLING] Pet owner data loaded:', customerData);
                  billData.customerName = customerData.name || `${customerData.firstName || ''} ${customerData.lastName || ''}`.trim();
                } else {
                  console.error('[BILLING] Error fetching pet owner:', petOwnerResponse.status);

                }
              } else {
                console.error('[BILLING] Error fetching customer:', response.status);

              }
            };
            await fetchCustomer();
          } catch (custError) {
            console.error('[BILLING] Error fetching customer details:', custError);
            // Continue with existing customer name if fetch fails
          }
        }


        // Always attempt to find the correct customer name regardless of current value
        console.log('[BILLING] Starting customer resolution for bill:', billData.id, 'Current name:', billData.customerName);

        // Always reset customer name to force proper resolution
        console.log('[BILLING] Resetting customer name for resolution. Current:', billData.customerName);
        billData.customerName = '';

        // Attempt to get customer through customerId if available
        if (billData.customerId && billData.customerId.trim() !== '') {
          try {
            console.log('[BILLING] Attempting to get customer through customerId:', billData.customerId);
            const customerRef = doc(db, 'customers', billData.customerId);
            const customerDoc = await getDoc(customerRef);

            if (customerDoc.exists()) {
              const customerData: CustomerData = customerDoc.data() as CustomerData;
              const nameFromCustomer = customerData.name ||
                `${customerData.firstName || ''} ${customerData.lastName || ''}`.trim() ||
                customerData.displayName || '';

              if (nameFromCustomer && nameFromCustomer !== 'Sam Smith' && nameFromCustomer !== 'John Doe') {
                billData.customerName = nameFromCustomer;
                console.log('[BILLING] Updated customer name using customerId:', billData.customerName);
              }
            } else {
              console.log('[BILLING] Customer document not found for ID:', billData.customerId);
            }
          } catch (custError) {
            console.error('[BILLING] Error fetching customer details by customerId:', custError);
          }
        }

        // If there's a petId, prioritize getting customer through the pet regardless of current state
        if (billData.petId) {
          try {
            console.log('[BILLING] Attempting to get customer through pet ID:', billData.petId);
            const petRef = doc(db, 'pets', billData.petId);
            const petDoc = await getDoc(petRef);

            if (petDoc.exists()) {
              const petData = petDoc.data();
              console.log('[BILLING] Pet data found:', petData);
              console.log('[BILLING] Attempting to extract owner from pet with ID:', billData.petId);

              // Try various possible owner reference structures
              let ownerId = null;

              // Check customerId first as it appears to be the primary field in your DB structure
              if (petData.customerId) {
                ownerId = petData.customerId;
                console.log('[BILLING] Found customerId directly on pet:', ownerId);
              } else if (petData.ownerId) {
                ownerId = petData.ownerId;
                console.log('[BILLING] Found ownerId directly on pet:', ownerId);
              } else if (petData.owner?.id) {
                ownerId = petData.owner.id;
                console.log('[BILLING] Found ownerId in pet.owner.id:', ownerId);
              } else if (typeof petData.owner === 'string') {
                ownerId = petData.owner;
                console.log('[BILLING] Found ownerId as string in pet.owner:', ownerId);
              }

              if (ownerId && typeof ownerId === 'string') {
                console.log('[BILLING] Looking up customer with ID:', ownerId);
                const customerRef = doc(db, 'customers', ownerId);
                const customerDoc = await getDoc(customerRef);

                if (customerDoc.exists()) {
                  const customerData: CustomerData = customerDoc.data() as CustomerData;
                  billData.customerName = customerData.name ||
                    `${customerData.firstName || ''} ${customerData.lastName || ''}`.trim() ||
                    customerData.displayName ||
                    '';
                  console.log('[BILLING] Updated customer name from pet owner:', billData.customerName);
                } else {
                  console.log('[BILLING] Customer document not found for pet owner ID:', ownerId);
                }
              } else {
                console.log('[BILLING] Could not find valid owner ID in pet data');
              }
            } else {
              console.log('[BILLING] Pet not found for ID:', billData.petId);
            }
          } catch (petError) {
            console.error('[BILLING] Error fetching pet owner details:', petError);
          }
        }

        // Last resort: Check if appointmentId is available and get customer through that
        if ((!billData.customerName || billData.customerName.trim() === '') && billData.appointmentId) {
          try {
            console.log('[BILLING] Attempting to get customer through appointment ID:', billData.appointmentId);
            const appointmentRef = doc(db, 'appointments', billData.appointmentId);
            const appointmentDoc = await getDoc(appointmentRef);

            if (appointmentDoc.exists()) {
              const appointmentData = appointmentDoc.data();
              console.log('[BILLING] Appointment data found:', appointmentData);

              // Try various possible customer reference structures
              let customerId = null;

              if (appointmentData.customerId) {
                customerId = appointmentData.customerId;
                console.log('[BILLING] Found customerId directly on appointment:', customerId);
              } else if (appointmentData.customer?.id) {
                customerId = appointmentData.customer.id;
                console.log('[BILLING] Found customerId in appointment.customer.id:', customerId);
              } else if (typeof appointmentData.customer === 'string') {
                customerId = appointmentData.customer;
                console.log('[BILLING] Found customerId as string in appointment.customer:', customerId);
              }

              if (customerId && typeof customerId === 'string') {
                console.log('[BILLING] Looking up customer with ID from appointment:', customerId);
                const customerRef = doc(db, 'customers', customerId);
                const customerDoc = await getDoc(customerRef);

                if (customerDoc.exists()) {
                  const customerData: CustomerData = customerDoc.data() as CustomerData;
                  billData.customerName = customerData.name ||
                    `${customerData.firstName || ''} ${customerData.lastName || ''}`.trim() ||
                    customerData.displayName ||
                    '';
                  console.log('[BILLING] Updated customer name from appointment data:', billData.customerName);
                }
              }
            }
          } catch (apptError) {
            console.error('[BILLING] Error fetching appointment details:', apptError);
          }
        }

        // If we still don't have a name after all attempts
        if (!billData.customerName || billData.customerName.trim() === '') {
          billData.customerName = 'Unknown Customer';
          console.log('[BILLING] Using fallback customer name after all attempts failed');
        }

        console.log('[BILLING] Final customer name:', billData.customerName);
        setBill(billData);
      } catch (error) {
        console.error('[BILLING] Error fetching bill:', error);
        setLocation('/billing');
      } finally {
        setLoading(false);
      }
    };

    fetchBill();
  }, [params?.id, getBillById, setLocation, navigate, getIdToken]);

  // Convert Firestore timestamp to Date object properly
  const billDate = bill?.createdAt instanceof Date
    ? bill.createdAt
    : bill?.createdAt && typeof bill.createdAt === 'object' && typeof (bill.createdAt as any).toDate === 'function'
      ? (bill.createdAt as any).toDate()
      : bill?.createdAt
        ? new Date(bill.createdAt)
        : new Date();

  // Format the date and time - prioritizing createdAt
  const formattedDate = billDate ? format(billDate, 'dd MMMM yyyy') : 'Date not available';
  const formattedTime = billDate ? format(billDate, 'hh:mm a') : 'Time not available';

  // Get customer display name - improved handling of nullish values
  const customerDisplayName = bill?.customerName ?? (bill?.customerId ? `Customer ${bill.customerId.slice(0, 8)}...` : 'N/A');


  // Define status color mapping
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'bg-green-100 text-green-800';
      case 'PENDING_PAYMENT': return 'bg-yellow-100 text-yellow-800';
      case 'CANCELED': return 'bg-gray-100 text-gray-800';
      case 'REFUNDED': return 'bg-blue-100 text-blue-800';
      case 'FAILED': return 'bg-red-100 text-red-800';
      default: return '';
    }
  };

  useEffect(() => {
    console.log('[BILLING] BillDetailsPage mounted, billId:', billId);
  }, [billId]);

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
                  <span>{customerDisplayName}</span>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Date</h3>
                <div className="flex items-center space-x-2 mb-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{formattedDate}</span>
                </div>
                <div className="flex items-center space-x-2 mb-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{formattedTime}</span>
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

// This function is no longer needed as we're getting the customer name from the API response
async function getCustomerName(customerId: string | undefined): Promise<string | undefined> {
  if (!customerId) return undefined;
  // We don't need to fetch customer name here anymore as it's included in the bill data
  // Just returning undefined will allow the bill's customerName to be used
  return undefined;
}