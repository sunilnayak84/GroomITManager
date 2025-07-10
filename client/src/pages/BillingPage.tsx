import React, { useState } from 'react';
import { format } from 'date-fns';
import { 
  Eye, 
  Plus, 
  Download, 
  Filter,
  CreditCard,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Settings,
  Percent,
  IndianRupee,
  Trash2,
  MoreHorizontal
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { BillStatus, Bill, GSTConfiguration, PaymentInfo, DiscountApplication } from '@/types/billing';
import { useBilling, formatIndianCurrency } from '@/hooks/use-billing';
import { useLocation } from 'wouter';
import { auth } from '@/lib/firebase';
import GSTConfigDialog from '@/components/GSTConfigDialog';
import PaymentDialog from '@/components/PaymentDialog';
import BillDiscountDialog from '@/components/BillDiscountDialog';
import { useToast } from '@/hooks/use-toast';
import { getApiBaseUrl } from '@/lib/api-config';

function EmptyState() {
  return (
    <div className="text-center py-12">
      <div className="flex justify-center mb-4">
        <div className="p-3 bg-muted rounded-full">
          <FileText className="h-8 w-8 text-muted-foreground" />
        </div>
      </div>
      <h3 className="text-lg font-semibold mb-2">No bills found</h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
        You haven't created any bills yet. Start by generating bills from completed appointments.
      </p>
      <Button>
        <Plus className="h-4 w-4 mr-2" />
        Create First Bill
      </Button>
    </div>
  );
}

function BillSkeleton() {
  return (
    <TableRow>
      <TableCell>
        <div className="flex flex-col space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-3 w-24 md:hidden" />
        </div>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <Skeleton className="h-4 w-32" />
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <Skeleton className="h-4 w-24" />
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <Skeleton className="h-4 w-20" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-6 w-16" />
      </TableCell>
      <TableCell className="text-right">
        <Skeleton className="h-8 w-16 ml-auto" />
      </TableCell>
    </TableRow>
  );
}

function getStatusIcon(status: BillStatus) {
  switch (status) {
    case 'PAID':
      return <CheckCircle className="h-4 w-4" />;
    case 'PENDING_PAYMENT':
      return <Clock className="h-4 w-4" />;
    case 'DRAFT':
      return <FileText className="h-4 w-4" />;
    case 'FAILED':
      return <XCircle className="h-4 w-4" />;
    case 'CANCELED':
      return <XCircle className="h-4 w-4" />;
    case 'REFUNDED':
      return <AlertCircle className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
}

function getStatusColor(status: BillStatus): string {
  switch (status) {
    case 'PAID':
      return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
    case 'PENDING_PAYMENT':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
    case 'DRAFT':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    case 'FAILED':
      return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
    case 'CANCELED':
      return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
    case 'REFUNDED':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
  }
}

const STATUS_OPTIONS: { value: BillStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All Bills' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PENDING_PAYMENT', label: 'Pending Payment' },
  { value: 'PAID', label: 'Paid' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'CANCELED', label: 'Canceled' },
  { value: 'REFUNDED', label: 'Refunded' },
];

export default function BillingPage() {
  const [, navigate] = useLocation();
  const { bills, isLoading, isError, error, refetch } = useBilling();
  const [statusFilter, setStatusFilter] = useState<BillStatus | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [showGSTConfig, setShowGSTConfig] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedBillForPayment, setSelectedBillForPayment] = useState<Bill | null>(null);
  const [selectedBillForDiscount, setSelectedBillForDiscount] = useState<Bill | null>(null);
  const [showDiscountDialog, setShowDiscountDialog] = useState(false);
  const [gstConfiguration, setGstConfiguration] = useState<GSTConfiguration | undefined>();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { toast } = useToast();

  // Get current user and role
  React.useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const token = await user.getIdTokenResult();
        setCurrentUser({
          email: user.email,
          role: token.claims.role || 'staff',
          isAdmin: token.claims.role === 'admin'
        });
      } else {
        setCurrentUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // Filter bills based on status and search term
  const filteredBills = bills.filter(bill => {
    const matchesStatus = statusFilter === 'ALL' || bill.status === statusFilter;
    const matchesSearch = !searchTerm || 
      bill.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.billNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  const handleViewBill = (billId: string) => {
    navigate(`/billing/${billId}`);
  };

  const formatDate = (date: Date | string) => {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return format(dateObj, 'dd MMM yyyy');
    } catch {
      return 'Invalid Date';
    }
  };

  const calculateTotal = (bill: Bill) => {
    return bill.totalAmount || (bill.subtotal - bill.discountAmount + bill.totalTaxAmount);
  };

  const handleGSTConfigSave = async (config: GSTConfiguration) => {
    try {
      // Here we would save the GST configuration to the backend
      // For now, just save it to local state
      setGstConfiguration(config);
      
      toast({
        title: "GST Configuration Saved",
        description: "Your GST settings have been updated successfully.",
      });
    } catch (error) {
      console.error('Error saving GST configuration:', error);
      toast({
        title: "Error",
        description: "Failed to save GST configuration. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePaymentRecord = async (paymentInfo: PaymentInfo) => {
    try {
      if (!selectedBillForPayment) return;
      
      const user = auth.currentUser;
      if (!user) {
        throw new Error("Authentication required");
      }

      const token = await user.getIdToken();
      const apiBaseUrl = getApiBaseUrl();

      const response = await fetch(
        `${apiBaseUrl}/api/billing/bills/${selectedBillForPayment.id}/payment`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            method: paymentInfo.method,
            amount: paymentInfo.amount,
            transactionId: paymentInfo.transactionId,
            notes: paymentInfo.notes,
          }),
        }
      );

      if (!response.ok) {
        let errorMessage = `Server returned ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
          console.error("Failed to parse error response:", parseError);
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      toast({
        title: "Payment Recorded",
        description: `Payment of ${formatIndianCurrency(paymentInfo.amount)} recorded successfully`,
      });
      
      // Refresh the bills list
      refetch();
      setShowPaymentDialog(false);
      setSelectedBillForPayment(null);
    } catch (error) {
      console.error('Error recording payment:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to record payment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePaymentClick = (bill: Bill) => {
    setSelectedBillForPayment(bill);
    setShowPaymentDialog(true);
  };

  const handleDiscountClick = (bill: Bill) => {
    setSelectedBillForDiscount(bill);
    setShowDiscountDialog(true);
  };

  const handleDiscountApply = async (discountApplication: DiscountApplication) => {
    try {
      if (!selectedBillForDiscount) return;

      const user = auth.currentUser;
      if (!user) {
        throw new Error("Authentication required");
      }

      const token = await user.getIdToken();
      const apiBaseUrl = getApiBaseUrl();

      console.log('[DISCOUNT] About to send:', discountApplication);
      console.log('[DISCOUNT] Sending to backend:', JSON.stringify({
        discount: discountApplication
      }, null, 2));

      // Apply discount via backend API
      const response = await fetch(
        `${apiBaseUrl}/api/billing/bills/${selectedBillForDiscount.id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            discount: discountApplication
          }),
        }
      );

      console.log('[DISCOUNT] Response status:', response.status);
      console.log('[DISCOUNT] Response ok:', response.ok);

      if (!response.ok) {
        let errorMessage = `Server returned ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
          console.error("Failed to parse error response:", parseError);
        }
        throw new Error(errorMessage);
      }

      let discountAmount = 0;
      let description = '';

      if (discountApplication.percentage) {
        discountAmount = selectedBillForDiscount.subtotal * (discountApplication.percentage / 100);
        if (discountApplication.maxAmount && discountAmount > discountApplication.maxAmount) {
          discountAmount = discountApplication.maxAmount;
        }
        description = `${discountApplication.percentage}% discount (₹${discountAmount.toFixed(2)}) applied to bill ${selectedBillForDiscount.billNumber}`;
      } else if (discountApplication.fixedAmount) {
        discountAmount = Math.min(discountApplication.fixedAmount, selectedBillForDiscount.subtotal);
        description = `₹${discountAmount.toFixed(2)} discount applied to bill ${selectedBillForDiscount.billNumber}`;
      }
      
      toast({
        title: "Discount Applied",
        description,
      });
      
      // Refresh the bills list
      await refetch();
      setShowDiscountDialog(false);
      setSelectedBillForDiscount(null);
    } catch (error) {
      console.error('Error applying discount:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to apply discount. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDiscountRemove = async (bill: Bill) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error("Authentication required");
      }

      const token = await user.getIdToken();
      const apiBaseUrl = getApiBaseUrl();

      console.log('[DISCOUNT] Removing discount for bill:', bill.id);

      // Remove discount via backend API
      const response = await fetch(
        `${apiBaseUrl}/api/billing/bills/${bill.id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            discount: null
          }),
        }
      );

      if (!response.ok) {
        let errorMessage = `Server returned ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
          console.error("Failed to parse error response:", parseError);
        }
        throw new Error(errorMessage);
      }

      toast({
        title: "Discount Removed",
        description: `Discount has been removed from bill ${bill.billNumber}`,
      });
      
      // Refresh the bills list
      await refetch();
    } catch (error) {
      console.error('Error removing discount:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove discount. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteBill = async (bill: Bill) => {
    try {
      if (!currentUser?.isAdmin) {
        throw new Error("Only admin users can delete bills");
      }

      // Confirm deletion
      if (!confirm(`Are you sure you want to delete bill ${bill.billNumber}? This action cannot be undone.`)) {
        return;
      }

      const user = auth.currentUser;
      if (!user) {
        throw new Error("Authentication required");
      }

      const token = await user.getIdToken();
      const apiBaseUrl = getApiBaseUrl();

      const response = await fetch(
        `${apiBaseUrl}/api/billing/bills/${bill.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        let errorMessage = `Server returned ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
          console.error("Failed to parse error response:", parseError);
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      toast({
        title: "Bill Deleted",
        description: `Bill ${bill.billNumber} has been deleted successfully`,
      });
      
      // Refresh the bills list
      refetch();
    } catch (error) {
      console.error('Error deleting bill:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete bill. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleFinalizeDraft = async (bill: Bill) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error("Authentication required");
      }

      const token = await user.getIdToken();
      const apiBaseUrl = getApiBaseUrl();

      const response = await fetch(
        `${apiBaseUrl}/api/billing/bills/${bill.id}/status`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: 'PENDING_PAYMENT'
          }),
        }
      );

      if (!response.ok) {
        let errorMessage = `Server returned ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
          console.error("Failed to parse error response:", parseError);
        }
        throw new Error(errorMessage);
      }

      toast({
        title: "Bill Finalized",
        description: "Bill is now ready for payment and discount options",
      });

      // Refresh the bills list
      refetch();
    } catch (error) {
      console.error('Error finalizing bill:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to finalize bill. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isError) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Error Loading Bills</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {error?.message || 'Failed to load bills. Please try again.'}
          </p>
          <Button onClick={() => refetch()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto mobile-padding">
      {/* Header */}
      <div className="mobile-stack items-start sm:items-center justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Bills & Invoices</h1>
          <p className="text-sm sm:text-base text-muted-foreground mobile-hidden">
            Manage billing and payment records
          </p>
        </div>
        <div className="responsive-button-group">
          <Button variant="outline" onClick={() => setShowGSTConfig(true)} className="mobile-full-width">
            <Settings className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
            <span className="text-sm sm:text-base">GST Config</span>
          </Button>
          <Button variant="outline" className="mobile-full-width">
            <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
            <span className="text-sm sm:text-base">Export</span>
          </Button>
          <Button className="mobile-full-width">
            <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
            <span className="text-sm sm:text-base">Create Bill</span>
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="mobile-stack gap-2 sm:gap-4 mb-6">
        <div className="flex-1">
          <Input
            placeholder="Search bills by customer, bill number, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:max-w-md"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="mobile-full-width">
              <Filter className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
              <span className="text-sm sm:text-base">
                {STATUS_OPTIONS.find(option => option.value === statusFilter)?.label}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {STATUS_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => setStatusFilter(option.value)}
              >
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Bills Table */}
      <div className="border rounded-lg overflow-hidden">
        {isLoading ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bill #</TableHead>
                <TableHead className="hidden md:table-cell">Customer</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
                <TableHead className="hidden md:table-cell">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <BillSkeleton key={i} />
              ))}
            </TableBody>
          </Table>
        ) : filteredBills.length === 0 ? (
          <EmptyState />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bill #</TableHead>
                <TableHead className="hidden md:table-cell">Customer</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
                <TableHead className="hidden md:table-cell">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBills.map((bill) => (
                <TableRow 
                  key={bill.id} 
                  className="hover:bg-muted/50 cursor-pointer"
                  onClick={() => handleViewBill(bill.id)}
                >
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>#{bill.billNumber || bill.id.slice(0, 8)}</span>
                      <span className="text-xs text-muted-foreground md:hidden">
                        {bill.customerName || 'Unknown Customer'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {bill.customerName || 'Unknown Customer'}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {formatDate(bill.createdAt)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell font-medium">
                    <div className="flex flex-col">
                      <span>{formatIndianCurrency(calculateTotal(bill))}</span>
                      {bill.discount && bill.discountAmount > 0 && (
                        <span className="text-xs text-orange-600 flex items-center gap-1">
                          <Percent className="h-3 w-3" />
                          {formatIndianCurrency(bill.discountAmount)} discount
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${getStatusColor(bill.status)} flex items-center gap-1 w-fit`}>
                      {getStatusIcon(bill.status)}
                      <span className="capitalize">{bill.status.replace('_', ' ').toLowerCase()}</span>
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center gap-2">
                      {/* Finalize Draft Button - Only for DRAFT bills */}
                      {bill.status === 'DRAFT' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFinalizeDraft(bill);
                          }}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Finalize
                        </Button>
                      )}
                      
                      {/* Discount Button - Only for Admin/Manager with PENDING_PAYMENT status */}
                      {bill.status === 'PENDING_PAYMENT' && (
                        <>
                          {/* Show Apply Discount button if no discount is applied */}
                          {(!bill.discount || bill.discountAmount === 0) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDiscountClick(bill);
                              }}
                              className="text-orange-600 hover:text-orange-700"
                            >
                              <Percent className="h-3 w-3 mr-1" />
                              Discount
                            </Button>
                          )}
                          
                          {/* Show Remove Discount button if discount is applied */}
                          {bill.discount && bill.discountAmount > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDiscountRemove(bill);
                              }}
                              className="text-red-600 hover:text-red-700"
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              Remove Discount
                            </Button>
                          )}
                        </>
                      )}
                      
                      {/* Payment Button - Only for pending bills */}
                      {bill.status === 'PENDING_PAYMENT' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePaymentClick(bill);
                          }}
                          className="text-green-600 hover:text-green-700"
                        >
                          <CreditCard className="h-3 w-3 mr-1" />
                          Payment
                        </Button>
                      )}

                      {/* Delete Button - Only for admin users */}
                      {currentUser?.isAdmin && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => e.stopPropagation()}
                              className="h-8 w-8 p-0"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Admin Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteBill(bill);
                              }}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Bill
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}

                      {/* View Button - Always available */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewBill(bill.id);
                        }}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Summary Stats */}
      {filteredBills.length > 0 && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-card p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Bills</p>
                <p className="text-2xl font-bold">{filteredBills.length}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
          <div className="bg-card p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-2xl font-bold">
                  {formatIndianCurrency(
                    filteredBills.reduce((sum, bill) => sum + calculateTotal(bill), 0)
                  )}
                </p>
              </div>
              <CreditCard className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
          <div className="bg-card p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Paid</p>
                <p className="text-2xl font-bold text-green-600">
                  {filteredBills.filter(bill => bill.status === 'PAID').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <div className="bg-card p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {filteredBills.filter(bill => bill.status === 'PENDING_PAYMENT').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </div>
        </div>
      )}

      {/* GST Configuration Dialog */}
      <GSTConfigDialog
        open={showGSTConfig}
        onOpenChange={setShowGSTConfig}
        currentConfig={gstConfiguration}
        onSave={handleGSTConfigSave}
      />

      {/* Payment Dialog */}
      {selectedBillForPayment && (
        <PaymentDialog
          open={showPaymentDialog}
          onOpenChange={setShowPaymentDialog}
          billAmount={calculateTotal(selectedBillForPayment)}
          billId={selectedBillForPayment.id}
          customerName={selectedBillForPayment.customerName}
          onPaymentRecord={handlePaymentRecord}
        />
      )}

      {/* Discount Dialog */}
      {selectedBillForDiscount && (
        <BillDiscountDialog
          open={showDiscountDialog}
          onOpenChange={setShowDiscountDialog}
          billSubtotal={calculateTotal(selectedBillForDiscount)}
          currentDiscount={undefined}
          onApply={handleDiscountApply}
        />
      )}
    </div>
  );
}