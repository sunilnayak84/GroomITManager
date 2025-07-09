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
import { 
  CreditCard, 
  ExternalLink, 
  Calendar, 
  User, 
  Package, 
  Eye, 
  Clock,
  Download,
  ArrowRightIcon
} from 'lucide-react';
import { BillStatus, Bill } from '@/types/billing';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function EmptyState() {
  return (
    <div className="text-center py-10">
      <CreditCard className="h-12 w-12 mx-auto text-muted-foreground" />
      <h3 className="mt-4 text-lg font-semibold">No bills found</h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
        There are no bills matching your filter criteria. Try changing the filter or check back later.
      </p>
    </div>
  );
}

function BillSkeleton() {
  return (
    <div className="w-full">
      <div className="flex items-center space-x-4 py-4 border-b">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="space-y-2 hidden md:block flex-1">
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="space-y-2 hidden md:block flex-1">
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="space-y-2 hidden md:block flex-1">
          <Skeleton className="h-5 w-16" />
        </div>
        <div className="flex justify-end">
          <Skeleton className="h-9 w-20" />
        </div>
      </div>
    </div>
  );
}

export default function BillingPage() {
  const [filter, setFilter] = useState<BillStatus | 'ALL'>('ALL');
  const { bills, isLoading } = useBilling();
  const [, params] = useLocation();

  // Get query parameters (for direct bill opening)
  const queryParams = new URLSearchParams(window.location.search);
  const billId = queryParams.get('billId');

  // Open bill directly if billId is provided (only run once)
  useEffect(() => {
    if (billId && bills && bills.length > 0) {
      const bill = bills.find(b => b.id === billId);
      if (bill) {
        window.location.href = `/billing/${billId}`;
      }
    }
  }, [billId]); // Only depend on billId, not bills

  // Filter bills based on selected status
  const filteredBills = filter === 'ALL'
    ? (bills || [])
    : (bills || []).filter(bill => bill.status === filter);

  const handleFilterChange = (newFilter: BillStatus | 'ALL') => {
    setFilter(newFilter);
  };

  // Define status color mapping for badges
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'PAID': return 'bg-green-100 text-green-800';
      case 'PENDING_PAYMENT': return 'bg-yellow-100 text-yellow-800';
      case 'DRAFT': return 'bg-gray-100 text-gray-800';
      case 'FAILED': return 'bg-red-100 text-red-800';
      default: return '';
    }
  };

  const navigateToBill = (billId: string | undefined) => {
    if (billId) {
      // Use wouter's navigation instead of direct window.location
      window.location.href = `/billing/${billId}`;
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Billing</h1>
          <p className="text-muted-foreground">Manage and view all your bills</p>
        </div>
        <div className="mt-4 sm:mt-0 flex flex-wrap gap-2">
          <Button 
            variant={filter === 'ALL' ? "default" : "outline"} 
            size="sm" 
            onClick={() => handleFilterChange('ALL')}
          >
            All
          </Button>
          <Button 
            variant={filter === 'PENDING_PAYMENT' ? "default" : "outline"} 
            size="sm" 
            onClick={() => handleFilterChange('PENDING_PAYMENT')}
          >
            Pending
          </Button>
          <Button 
            variant={filter === 'PAID' ? "default" : "outline"} 
            size="sm" 
            onClick={() => handleFilterChange('PAID')}
          >
            Paid
          </Button>
          <Button 
            variant={filter === 'DRAFT' ? "default" : "outline"} 
            size="sm" 
            onClick={() => handleFilterChange('DRAFT')}
          >
            Draft
          </Button>
        </div>
      </div>

      <div className="responsive-table-container">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <BillSkeleton key={i} />
            ))}
          </div>
        ) : !filteredBills || filteredBills.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead className="hidden md:table-cell">Customer</TableHead>
                  <TableHead className="hidden md:table-cell">Date</TableHead>
                  <TableHead className="hidden md:table-cell">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBills.map(bill => {
                  // Handle Firestore timestamp conversion properly
                  // Safely handle various date formats
                  const createdDate = (() => {
                    if (bill.createdAt instanceof Date) {
                      return bill.createdAt;
                    }

                    if (bill.createdAt && typeof bill.createdAt === 'object') {
                      // Handle Firestore Timestamp objects that have toDate method
                      if (typeof (bill.createdAt as any).toDate === 'function') {
                        return (bill.createdAt as any).toDate();
                      }
                    }

                    // Handle string dates or use current date as fallback
                    return new Date(bill.createdAt || Date.now());
                  })();

                  // Format the date with date-fns
                  const formattedDate = format(createdDate, 'dd MMM yyyy');

                  const invoiceId = bill.id ? bill.id.slice(0, 8) : 'N/A';

                  // Calculate total from items
                  const total = bill.items?.reduce((sum, item) => sum + (item.subtotal || 0), 0) || 0;

                  let customerName = bill.customerName; // Use existing customerName as a fallback

                  return (
                    <TableRow key={bill.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => navigateToBill(bill.id)}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>#{invoiceId}</span>
                          <span className="text-xs text-muted-foreground md:hidden">
                            {customerName || 'Customer'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{customerName || 'Unknown Customer'}</TableCell>
                      <TableCell className="hidden md:table-cell">{formattedDate}</TableCell>
                      <TableCell className="hidden md:table-cell">{formatIndianCurrency(total)}</TableCell>
                      <TableCell>
                        <Badge className={`${getStatusColor(bill.status)}`}>
                          {bill.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigateToBill(bill.id);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          <span className="hidden sm:inline">View</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}