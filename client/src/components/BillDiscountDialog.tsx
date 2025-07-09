import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-user';
import { DiscountApplication } from '@/types/billing';
import { formatIndianCurrency } from '@/lib/utils';

const discountSchema = z.object({
  type: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']),
  value: z.number().min(0.01, 'Discount value must be greater than 0'),
  reason: z.string().min(3, 'Reason is required (minimum 3 characters)'),
  maxAmount: z.number().optional(),
}).refine((data) => {
  // For percentage discounts, maxAmount is always optional
  // For fixed amount discounts, maxAmount is not used
  return true;
}, {
  message: "Invalid discount configuration",
});

type DiscountForm = z.infer<typeof discountSchema>;

interface BillDiscountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  billSubtotal: number;
  currentDiscount?: DiscountApplication;
  onApply: (discount: DiscountApplication) => void;
}

export default function BillDiscountDialog({ 
  open, 
  onOpenChange, 
  billSubtotal,
  currentDiscount,
  onApply 
}: BillDiscountDialogProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<DiscountForm>({
    resolver: zodResolver(discountSchema),
    defaultValues: {
      type: 'PERCENTAGE',
      value: 0,
      reason: '',
      maxAmount: undefined,
    },
  });

  const watchType = form.watch('type');
  const watchValue = form.watch('value');

  // Calculate discount preview
  const calculateDiscountAmount = () => {
    const value = watchValue || 0;
    if (watchType === 'PERCENTAGE') {
      const discountAmount = (billSubtotal * value) / 100;
      const maxAmount = form.getValues('maxAmount');
      return maxAmount ? Math.min(discountAmount, maxAmount) : discountAmount;
    }
    return Math.min(value, billSubtotal);
  };

  const discountAmount = calculateDiscountAmount();
  const finalAmount = billSubtotal - discountAmount;

  // Check if user can apply discount
  const canApplyDiscount = user?.role === 'admin' || user?.role === 'manager';
  const requiresApproval = user?.role === 'staff';

  const onSubmit = async (data: DiscountForm) => {
    try {
      setIsLoading(true);

      if (!user) {
        toast({
          title: "Error",
          description: "User information not available",
          variant: "destructive",
        });
        return;
      }

      // Validate discount limits based on role
      if (user.role === 'staff') {
        if (data.type === 'PERCENTAGE' && data.value > 10) {
          toast({
            title: "Discount Limit Exceeded",
            description: "Staff can only apply up to 10% discount",
            variant: "destructive",
          });
          return;
        }
        if (data.type === 'FIXED_AMOUNT' && data.value > 500) {
          toast({
            title: "Discount Limit Exceeded",
            description: "Staff can only apply up to ₹500 discount",
            variant: "destructive",
          });
          return;
        }
      }

      if (user.role === 'manager') {
        if (data.type === 'PERCENTAGE' && data.value > 25) {
          toast({
            title: "Discount Limit Exceeded",
            description: "Managers can only apply up to 25% discount",
            variant: "destructive",
          });
          return;
        }
      }

      const discountApplication: DiscountApplication = {
        percentage: data.type === 'PERCENTAGE' ? data.value : undefined,
        fixedAmount: data.type === 'FIXED_AMOUNT' ? data.value : undefined,
        maxAmount: data.maxAmount,
        reason: data.reason,
        appliedBy: user.id || user.email || 'unknown',
        appliedByRole: user.role as 'admin' | 'manager' | 'staff',
        requiresApproval: requiresApproval,
        appliedAt: new Date(),
      };

      console.log('[DISCOUNT] Applying discount:', discountApplication);
      console.log('[DISCOUNT] Data being sent:', JSON.stringify(discountApplication, null, 2));

      await onApply(discountApplication);
      
      toast({
        title: requiresApproval ? "Discount Applied (Pending Approval)" : "Discount Applied",
        description: requiresApproval 
          ? "Discount has been applied and is pending manager approval"
          : `Discount of ${formatIndianCurrency(discountAmount)} applied successfully`,
      });
      
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error('Error applying discount:', error);
      toast({
        title: "Error",
        description: "Failed to apply discount. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getDiscountLimits = () => {
    switch (user?.role) {
      case 'admin':
        return "Unlimited discount (Admin privilege)";
      case 'manager':
        return "Up to 25% or unlimited amount";
      case 'staff':
        return "Up to 10% or ₹500 (requires approval)";
      default:
        return "No discount privileges";
    }
  };

  if (!canApplyDiscount && !requiresApproval) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Access Denied</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">
              You don't have permission to apply discounts. Only Managers and Admins can apply discounts.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Apply Discount</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Role-based limits info */}
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>Your Limits:</strong> {getDiscountLimits()}
            </p>
          </div>

          {/* Discount Type */}
          <div className="space-y-3">
            <Label>Discount Type</Label>
            <RadioGroup
              value={form.watch('type')}
              onValueChange={(value) => form.setValue('type', value as 'PERCENTAGE' | 'FIXED_AMOUNT')}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="PERCENTAGE" id="percentage" />
                <Label htmlFor="percentage">Percentage (%)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="FIXED_AMOUNT" id="fixed" />
                <Label htmlFor="fixed">Fixed Amount (₹)</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Discount Value */}
          <div className="space-y-2">
            <Label htmlFor="value">
              {watchType === 'PERCENTAGE' ? 'Discount Percentage' : 'Discount Amount'}
            </Label>
            <Input
              id="value"
              type="number"
              step={watchType === 'PERCENTAGE' ? '0.01' : '1'}
              min="0"
              max={watchType === 'PERCENTAGE' ? '100' : billSubtotal.toString()}
              {...form.register('value', { valueAsNumber: true })}
              placeholder={watchType === 'PERCENTAGE' ? '10' : '100'}
            />
            {form.formState.errors.value && (
              <p className="text-sm text-red-500">
                {form.formState.errors.value.message}
              </p>
            )}
          </div>

          {/* Max Amount for Percentage */}
          {watchType === 'PERCENTAGE' && (
            <div className="space-y-2">
              <Label htmlFor="maxAmount">Maximum Amount (Optional)</Label>
              <Input
                id="maxAmount"
                type="number"
                step="1"
                min="0"
                {...form.register('maxAmount', { 
                  setValueAs: (value) => value === '' || value === null ? undefined : Number(value)
                })}
                placeholder="500"
              />
              <p className="text-xs text-muted-foreground">
                Cap the percentage discount at this amount
              </p>
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Discount</Label>
            <Textarea
              id="reason"
              {...form.register('reason')}
              placeholder="e.g., First-time customer, loyalty discount, service issue compensation..."
              rows={3}
            />
            {form.formState.errors.reason && (
              <p className="text-sm text-red-500">
                {form.formState.errors.reason.message}
              </p>
            )}
          </div>

          {/* Discount Preview */}
          {watchValue > 0 && (
            <div className="p-4 bg-gray-50 rounded-lg space-y-2">
              <h4 className="font-medium">Discount Preview</h4>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatIndianCurrency(billSubtotal)}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Discount:</span>
                  <span>-{formatIndianCurrency(discountAmount)}</span>
                </div>
                <div className="flex justify-between font-medium border-t pt-1">
                  <span>New Total:</span>
                  <span>{formatIndianCurrency(finalAmount)}</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !watchValue}>
              {isLoading ? 'Applying...' : requiresApproval ? 'Apply (Pending Approval)' : 'Apply Discount'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}