import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { auth } from '@/lib/firebase';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { PaymentMethod, PaymentInfo } from '@/types/billing';
import { formatIndianCurrency } from '@/lib/utils';
import { 
  CreditCard, 
  Smartphone, 
  Banknote, 
  Wallet,
  Building,
  QrCode,
  ExternalLink 
} from 'lucide-react';

const paymentSchema = z.object({
  method: z.enum(['CASH', 'UPI_QR', 'UPI_ID', 'CARD', 'NET_BANKING', 'WALLET', 'RAZORPAY', 'BANK_TRANSFER']),
  transactionId: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentForm = z.infer<typeof paymentSchema>;

// Declare Razorpay types for TypeScript
declare global {
  interface Window {
    Razorpay: any;
  }
}

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  billAmount: number;
  billId: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  onPaymentRecord: (paymentInfo: PaymentInfo) => void;
}

export default function PaymentDialog({ 
  open, 
  onOpenChange, 
  billAmount,
  billId,
  customerName,
  customerPhone,
  customerEmail,
  onPaymentRecord
}: PaymentDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isRazorpayLoading, setIsRazorpayLoading] = useState(false);

  const form = useForm<PaymentForm>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      method: 'CASH',
      transactionId: '',
      notes: '',
    },
  });

  const selectedMethod = form.watch('method');

  const paymentMethods = [
    {
      id: 'CASH' as PaymentMethod,
      label: 'Cash Payment',
      description: 'Customer paid in cash',
      icon: Banknote,
      requiresTransactionId: false,
    },
    {
      id: 'UPI_QR' as PaymentMethod,
      label: 'UPI QR Code',
      description: 'Customer scanned QR code',
      icon: QrCode,
      requiresTransactionId: true,
    },
    {
      id: 'UPI_ID' as PaymentMethod,
      label: 'UPI ID Transfer',
      description: 'Direct UPI transfer',
      icon: Smartphone,
      requiresTransactionId: true,
    },
    {
      id: 'CARD' as PaymentMethod,
      label: 'Card Payment',
      description: 'Credit/Debit card',
      icon: CreditCard,
      requiresTransactionId: true,
    },
    {
      id: 'NET_BANKING' as PaymentMethod,
      label: 'Net Banking',
      description: 'Online banking transfer',
      icon: Building,
      requiresTransactionId: true,
    },
    {
      id: 'WALLET' as PaymentMethod,
      label: 'Digital Wallet',
      description: 'Paytm, PhonePe, etc.',
      icon: Wallet,
      requiresTransactionId: true,
    },
    {
      id: 'BANK_TRANSFER' as PaymentMethod,
      label: 'Bank Transfer',
      description: 'Direct bank transfer',
      icon: Building,
      requiresTransactionId: true,
    },
  ];

  const selectedMethodInfo = paymentMethods.find(m => m.id === selectedMethod);

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleRazorpayPayment = async () => {
    try {
      setIsRazorpayLoading(true);

      // Get auth token
      const user = auth.currentUser;
      if (!user) {
        throw new Error("Authentication required");
      }

      const token = await user.getIdToken();
      const apiBaseUrl = import.meta.env.VITE_API_URL || '';

      // Create Razorpay order
      const orderResponse = await fetch(`${apiBaseUrl}/api/billing/razorpay/create-order`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ billId }),
      });

      if (!orderResponse.ok) {
        throw new Error('Failed to create payment order');
      }

      const orderData = await orderResponse.json();

      // Configure Razorpay options
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'GroomIT Manager',
        description: `Payment for Bill #${billId}`,
        order_id: orderData.orderId,
        prefill: {
          name: customerName || '',
          email: customerEmail || '',
          contact: customerPhone || '',
        },
        theme: {
          color: '#3B82F6',
        },
        handler: async (response: any) => {
          try {
            // Verify payment
            const verifyResponse = await fetch(`${apiBaseUrl}/api/billing/razorpay/verify-payment`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                billId,
              }),
            });

            if (!verifyResponse.ok) {
              throw new Error('Payment verification failed');
            }

            const verifyData = await verifyResponse.json();

            toast({
              title: "Payment Successful",
              description: `Payment of ${formatIndianCurrency(billAmount)} completed successfully`,
            });

            onOpenChange(false);
            
            // Trigger a refresh of the bills list
            window.location.reload();

          } catch (error) {
            console.error('Payment verification error:', error);
            toast({
              title: "Payment Verification Failed",
              description: "Payment was processed but verification failed. Please contact support.",
              variant: "destructive",
            });
          }
        },
        modal: {
          ondismiss: () => {
            toast({
              title: "Payment Cancelled",
              description: "Payment was cancelled by the user",
              variant: "destructive",
            });
          }
        }
      };

      // Open Razorpay checkout
      const razorpay = new window.Razorpay(options);
      razorpay.open();

    } catch (error) {
      console.error('Razorpay payment error:', error);
      toast({
        title: "Payment Error",
        description: error instanceof Error ? error.message : "Failed to process online payment",
        variant: "destructive",
      });
    } finally {
      setIsRazorpayLoading(false);
    }
  };

  const onSubmit = async (data: PaymentForm) => {
    try {
      setIsLoading(true);

      // Validate transaction ID for methods that require it
      if (selectedMethodInfo?.requiresTransactionId && !data.transactionId?.trim()) {
        toast({
          title: "Transaction ID Required",
          description: `Please enter the transaction ID for ${selectedMethodInfo.label}`,
          variant: "destructive",
        });
        return;
      }

      const paymentInfo: PaymentInfo = {
        method: data.method,
        status: 'SUCCESS',
        amount: billAmount,
        transactionId: data.transactionId?.trim() || undefined,
        paidAt: new Date(),
        notes: data.notes?.trim() || undefined,
      };

      await onPaymentRecord(paymentInfo);
      
      toast({
        title: "Payment Recorded",
        description: `Payment of ${formatIndianCurrency(billAmount)} recorded successfully`,
      });
      
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error('Error recording payment:', error);
      toast({
        title: "Error",
        description: "Failed to record payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Payment Amount */}
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-lg font-medium">Amount to Pay:</span>
              <span className="text-2xl font-bold text-green-600">
                {formatIndianCurrency(billAmount)}
              </span>
            </div>
          </div>

          {/* Razorpay Option */}
          <div className="p-4 border rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-medium">Online Payment (Razorpay)</h3>
                <p className="text-sm text-muted-foreground">
                  Process secure online payment via Razorpay
                </p>
              </div>
              <Button 
                onClick={handleRazorpayPayment} 
                disabled={isRazorpayLoading}
                className="gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                {isRazorpayLoading ? 'Processing...' : 'Process Online Payment'}
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or record offline payment
              </span>
            </div>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Payment Method Selection */}
            <div className="space-y-3">
              <Label>Payment Method</Label>
              <RadioGroup
                value={selectedMethod}
                onValueChange={(value) => form.setValue('method', value as PaymentMethod)}
              >
                <div className="grid grid-cols-2 gap-3">
                  {paymentMethods.map((method) => {
                    const Icon = method.icon;
                    return (
                      <div key={method.id} className="relative">
                        <RadioGroupItem
                          value={method.id}
                          id={method.id}
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor={method.id}
                          className="flex flex-col items-start space-y-2 rounded-lg border-2 border-muted p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <Icon className="h-5 w-5" />
                            <span className="font-medium">{method.label}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {method.description}
                          </span>
                          {method.requiresTransactionId && (
                            <Badge variant="outline" className="text-xs">
                              Requires Transaction ID
                            </Badge>
                          )}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </RadioGroup>
            </div>

            {/* Transaction ID */}
            {selectedMethodInfo?.requiresTransactionId && (
              <div className="space-y-2">
                <Label htmlFor="transactionId">
                  Transaction ID / Reference Number *
                </Label>
                <Input
                  id="transactionId"
                  {...form.register('transactionId')}
                  placeholder="Enter transaction ID or reference number"
                />
                <p className="text-xs text-muted-foreground">
                  Enter the transaction ID provided by the payment system
                </p>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                {...form.register('notes')}
                placeholder="Any additional notes about the payment..."
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Recording...' : 'Record Payment'}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}