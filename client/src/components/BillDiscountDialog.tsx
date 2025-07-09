import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUser } from '@/hooks/use-user';
import { Percent, IndianRupee, AlertTriangle } from 'lucide-react';
import { formatIndianCurrency } from '@/lib/utils';
import { Discount } from '@/types/billing';

interface BillDiscountDialogProps {
  children: React.ReactNode;
  billSubtotal: number;
  onApplyDiscount: (discount: Discount) => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const DISCOUNT_REASONS = [
  'Senior Citizen Discount',
  'Regular Customer Discount',
  'Loyalty Program',
  'First Time Customer',
  'Multiple Pet Discount',
  'Service Issue Compensation',
  'Promotional Offer',
  'Special Occasion',
  'Other'
];

export default function BillDiscountDialog({ 
  children, 
  billSubtotal, 
  onApplyDiscount,
  isOpen,
  onOpenChange 
}: BillDiscountDialogProps) {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED_AMOUNT'>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');

  // Check if user has permission to apply discounts
  const canApplyDiscount = user?.role === 'admin' || user?.role === 'manager';

  if (!canApplyDiscount) {
    return null;
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    onOpenChange?.(newOpen);
  };

  const calculateDiscountAmount = (): number => {
    const value = parseFloat(discountValue) || 0;
    if (discountType === 'PERCENTAGE') {
      const percentage = Math.min(value, 100); // Cap at 100%
      const discountAmount = (billSubtotal * percentage) / 100;
      const maxAmountValue = parseFloat(maxAmount) || Infinity;
      return Math.min(discountAmount, maxAmountValue);
    } else {
      return Math.min(value, billSubtotal); // Cannot exceed bill amount
    }
  };

  const discountAmount = calculateDiscountAmount();
  const finalAmount = billSubtotal - discountAmount;

  const handleApplyDiscount = () => {
    const value = parseFloat(discountValue);
    if (!value || value <= 0) return;

    const finalReason = reason === 'Other' ? customReason : reason;
    if (!finalReason.trim()) return;

    const discount: Discount = {
      type: discountType,
      value,
      reason: finalReason,
      appliedBy: user?.id || '',
      appliedAt: new Date(),
      ...(discountType === 'PERCENTAGE' && maxAmount ? { maxAmount: parseFloat(maxAmount) } : {})
    };

    onApplyDiscount(discount);
    handleOpenChange(false);
    
    // Reset form
    setDiscountValue('');
    setReason('');
    setCustomReason('');
    setMaxAmount('');
  };

  const isValid = discountValue && parseFloat(discountValue) > 0 && 
    (reason !== 'Other' ? reason : customReason.trim());

  return (
    <Dialog open={isOpen ?? open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5" />
            Apply Discount
          </DialogTitle>
          <DialogDescription>
            Add a discount to this bill. Only Managers and Admins can apply discounts.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Discount Type */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Discount Type</Label>
            <RadioGroup
              value={discountType}
              onValueChange={(value) => setDiscountType(value as 'PERCENTAGE' | 'FIXED_AMOUNT')}
              className="flex space-x-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="PERCENTAGE" id="percentage" />
                <label htmlFor="percentage" className="flex items-center gap-1 text-sm">
                  <Percent className="h-4 w-4" />
                  Percentage
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="FIXED_AMOUNT" id="fixed" />
                <label htmlFor="fixed" className="flex items-center gap-1 text-sm">
                  <IndianRupee className="h-4 w-4" />
                  Fixed Amount
                </label>
              </div>
            </RadioGroup>
          </div>

          {/* Discount Value */}
          <div className="space-y-2">
            <Label htmlFor="discount-value">
              {discountType === 'PERCENTAGE' ? 'Percentage (%)' : 'Amount (₹)'}
            </Label>
            <Input
              id="discount-value"
              type="number"
              placeholder={discountType === 'PERCENTAGE' ? '10' : '100'}
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              min="0"
              max={discountType === 'PERCENTAGE' ? '100' : billSubtotal.toString()}
              step={discountType === 'PERCENTAGE' ? '0.1' : '1'}
            />
          </div>

          {/* Max Amount for Percentage Discounts */}
          {discountType === 'PERCENTAGE' && (
            <div className="space-y-2">
              <Label htmlFor="max-amount">Maximum Discount Amount (₹) - Optional</Label>
              <Input
                id="max-amount"
                type="number"
                placeholder="500"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                min="0"
              />
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Discount</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {DISCOUNT_REASONS.map((discountReason) => (
                  <SelectItem key={discountReason} value={discountReason}>
                    {discountReason}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Reason */}
          {reason === 'Other' && (
            <div className="space-y-2">
              <Label htmlFor="custom-reason">Custom Reason</Label>
              <Textarea
                id="custom-reason"
                placeholder="Please specify the reason for this discount..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                rows={3}
              />
            </div>
          )}

          {/* Preview */}
          {discountValue && parseFloat(discountValue) > 0 && (
            <div className="bg-blue-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>Original Amount:</span>
                <span>{formatIndianCurrency(billSubtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount:</span>
                <span>-{formatIndianCurrency(discountAmount)}</span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-2">
                <span>Final Amount:</span>
                <span>{formatIndianCurrency(finalAmount)}</span>
              </div>
            </div>
          )}

          {/* Warning for high discounts */}
          {discountAmount > billSubtotal * 0.5 && (
            <div className="flex items-center gap-2 text-amber-600 text-sm bg-amber-50 p-3 rounded-lg">
              <AlertTriangle className="h-4 w-4" />
              <span>High discount amount. Please ensure this is authorized.</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleApplyDiscount} disabled={!isValid}>
            Apply Discount
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}