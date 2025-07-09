import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useUser } from '@/hooks/use-user';
import { useBilling } from '@/hooks/use-billing';
import { useToast } from '@/hooks/use-toast';
import { 
  FileText, 
  Receipt, 
  Percent, 
  IndianRupee, 
  Calculator,
  MapPin,
  User,
  Phone,
  Mail
} from 'lucide-react';
import { formatIndianCurrency } from '@/lib/utils';
import { Discount, Address, BillCreateInput } from '@/types/billing';
import BillDiscountDialog from './BillDiscountDialog';

interface AppointmentData {
  id: string;
  petId: string;
  customerId: string;
  customerName?: string;
  pet?: {
    name: string;
    breed: string;
  };
  customer?: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  services: Array<{
    id: string;
    name: string;
    price: number;
    description?: string;
  }>;
  totalPrice: number;
  date: string;
  status: string;
}

interface EnhancedBillGenerationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: AppointmentData;
  onBillGenerated?: (billId: string) => void;
}

// Default Indian GST rates for pet grooming services
const GST_RATE = 18; // 18% GST for pet services in India

export default function EnhancedBillGenerationDialog({
  isOpen,
  onClose,
  appointment,
  onBillGenerated
}: EnhancedBillGenerationDialogProps) {
  const { user } = useUser();
  const { createBill } = useBilling();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [discount, setDiscount] = useState<Discount | null>(null);
  const [notes, setNotes] = useState('');
  const [billingAddress, setBillingAddress] = useState<Address>({
    line1: '',
    line2: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India'
  });

  // Auto-populate billing address from customer data
  useEffect(() => {
    if (appointment.customer?.address) {
      // Try to parse existing address if available
      const addressParts = appointment.customer.address.split(',').map(s => s.trim());
      if (addressParts.length > 0) {
        setBillingAddress(prev => ({
          ...prev,
          line1: addressParts[0] || '',
          city: addressParts[addressParts.length - 2] || '',
          state: addressParts[addressParts.length - 1] || ''
        }));
      }
    }
  }, [appointment.customer]);

  // Calculate amounts
  const subtotal = appointment.totalPrice || 0;
  const discountAmount = discount ? calculateDiscountAmount(discount, subtotal) : 0;
  const afterDiscountAmount = subtotal - discountAmount;
  
  // GST Calculation (18% split into CGST 9% + SGST 9% for same state)
  const gstAmount = afterDiscountAmount * (GST_RATE / 100);
  const cgst = gstAmount / 2;
  const sgst = gstAmount / 2;
  const totalAmount = afterDiscountAmount + gstAmount;

  function calculateDiscountAmount(discount: Discount, subtotal: number): number {
    if (discount.type === 'PERCENTAGE') {
      const percentage = Math.min(discount.value, 100);
      const discountAmount = (subtotal * percentage) / 100;
      return discount.maxAmount ? Math.min(discountAmount, discount.maxAmount) : discountAmount;
    } else {
      return Math.min(discount.value, subtotal);
    }
  }

  const handleApplyDiscount = (newDiscount: Discount) => {
    setDiscount(newDiscount);
    toast({
      title: "Discount Applied",
      description: `${newDiscount.type === 'PERCENTAGE' ? newDiscount.value + '%' : '₹' + newDiscount.value} discount has been applied.`,
    });
  };

  const handleRemoveDiscount = () => {
    setDiscount(null);
    toast({
      title: "Discount Removed",
      description: "The discount has been removed from this bill.",
    });
  };

  const handleGenerateBill = async () => {
    if (!appointment.id) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Invalid appointment data. Cannot generate bill.",
      });
      return;
    }

    setLoading(true);
    try {
      const billInput: BillCreateInput = {
        appointmentId: appointment.id,
        discount: discount || undefined,
        notes: notes.trim() || undefined,
        billingAddress: billingAddress.line1 ? billingAddress : undefined,
      };

      const result = await createBill(billInput);
      
      toast({
        title: "Bill Generated Successfully",
        description: `Bill has been created for ${appointment.customerName || 'the customer'}.`,
      });

      onBillGenerated?.(result.id || result.billId);
      onClose();
    } catch (error) {
      console.error('Error generating bill:', error);
      toast({
        variant: "destructive",
        title: "Error Generating Bill",
        description: error instanceof Error ? error.message : "Failed to generate bill. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const isAddressComplete = billingAddress.line1 && billingAddress.city && 
                           billingAddress.state && billingAddress.pincode;

  const canApplyDiscount = user?.role === 'admin' || user?.role === 'manager';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Generate Enhanced Bill
          </DialogTitle>
          <DialogDescription>
            Create a comprehensive Indian GST-compliant bill for this appointment.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column - Bill Details */}
          <div className="space-y-6">
            {/* Customer Information */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{appointment.customerName || 'Unknown Customer'}</span>
                </div>
                {appointment.customer?.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    {appointment.customer.email}
                  </div>
                )}
                {appointment.customer?.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    {appointment.customer.phone}
                  </div>
                )}
                {appointment.pet && (
                  <div className="text-muted-foreground">
                    Pet: {appointment.pet.name} ({appointment.pet.breed})
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Services */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Services Provided</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {appointment.services?.map((service, index) => (
                  <div key={service.id || index} className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{service.name}</div>
                      {service.description && (
                        <div className="text-xs text-muted-foreground">{service.description}</div>
                      )}
                    </div>
                    <div className="text-sm font-medium">
                      {formatIndianCurrency(service.price)}
                    </div>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between font-medium">
                  <span>Subtotal:</span>
                  <span>{formatIndianCurrency(subtotal)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Discount Section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    Discount
                  </span>
                  {canApplyDiscount && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        // We'll implement the discount dialog here
                        console.log('Add discount clicked');
                      }}
                    >
                      {discount ? 'Modify' : 'Add'} Discount
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {discount ? (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="space-y-1">
                        <Badge variant="secondary">
                          {discount.type === 'PERCENTAGE' ? `${discount.value}%` : formatIndianCurrency(discount.value)}
                        </Badge>
                        <div className="text-xs text-muted-foreground">
                          {discount.reason}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-green-600">
                          -{formatIndianCurrency(discountAmount)}
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={handleRemoveDiscount}
                          className="text-xs h-auto p-1"
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    {canApplyDiscount ? 'No discount applied' : 'Only Managers and Admins can apply discounts'}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Billing Address & Calculation */}
          <div className="space-y-6">
            {/* Billing Address */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Billing Address
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="line1">Address Line 1</Label>
                  <Input
                    id="line1"
                    value={billingAddress.line1}
                    onChange={(e) => setBillingAddress(prev => ({ ...prev, line1: e.target.value }))}
                    placeholder="Street address"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="line2">Address Line 2 (Optional)</Label>
                  <Input
                    id="line2"
                    value={billingAddress.line2}
                    onChange={(e) => setBillingAddress(prev => ({ ...prev, line2: e.target.value }))}
                    placeholder="Apartment, suite, etc."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={billingAddress.city}
                      onChange={(e) => setBillingAddress(prev => ({ ...prev, city: e.target.value }))}
                      placeholder="City"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={billingAddress.state}
                      onChange={(e) => setBillingAddress(prev => ({ ...prev, state: e.target.value }))}
                      placeholder="State"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pincode">PIN Code</Label>
                  <Input
                    id="pincode"
                    value={billingAddress.pincode}
                    onChange={(e) => setBillingAddress(prev => ({ ...prev, pincode: e.target.value }))}
                    placeholder="110001"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Tax Calculation */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  Tax Calculation (GST)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatIndianCurrency(subtotal)}</span>
                  </div>
                  {discount && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount:</span>
                      <span>-{formatIndianCurrency(discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Amount after discount:</span>
                    <span>{formatIndianCurrency(afterDiscountAmount)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-muted-foreground">
                    <span>CGST (9%):</span>
                    <span>{formatIndianCurrency(cgst)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>SGST (9%):</span>
                    <span>{formatIndianCurrency(sgst)}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Total GST:</span>
                    <span>{formatIndianCurrency(gstAmount)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total Amount:</span>
                    <span>{formatIndianCurrency(totalAmount)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional notes for the bill..."
                rows={3}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleGenerateBill} disabled={loading}>
            {loading ? 'Generating...' : 'Generate Bill'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}