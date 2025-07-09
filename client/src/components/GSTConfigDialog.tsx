import { useState, useEffect } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { GSTConfiguration } from '@/types/billing';
import { Separator } from '@/components/ui/separator';

const gstConfigSchema = z.object({
  enabled: z.boolean(),
  companyGSTNumber: z.string().min(15, 'Valid GST number required').max(15, 'GST number must be 15 characters'),
  companyName: z.string().min(1, 'Company name is required'),
  companyAddress: z.object({
    line1: z.string().min(1, 'Address line 1 is required'),
    line2: z.string().optional(),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    pincode: z.string().min(6, 'Valid pincode required').max(6, 'Pincode must be 6 digits'),
    country: z.string().default('India'),
  }),
  defaultGSTRate: z.number().min(0).max(30),
  cgstRate: z.number().min(0).max(15),
  sgstRate: z.number().min(0).max(15),
  igstRate: z.number().min(0).max(30),
  stateCode: z.string().min(2, 'State code required').max(2, 'State code must be 2 characters'),
});

type GSTConfigForm = z.infer<typeof gstConfigSchema>;

interface GSTConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentConfig?: GSTConfiguration;
  onSave: (config: GSTConfiguration) => void;
}

export default function GSTConfigDialog({ 
  open, 
  onOpenChange, 
  currentConfig,
  onSave 
}: GSTConfigDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<GSTConfigForm>({
    resolver: zodResolver(gstConfigSchema),
    defaultValues: {
      enabled: false,
      companyGSTNumber: '',
      companyName: '',
      companyAddress: {
        line1: '',
        line2: '',
        city: '',
        state: '',
        pincode: '',
        country: 'India',
      },
      defaultGSTRate: 18,
      cgstRate: 9,
      sgstRate: 9,
      igstRate: 18,
      stateCode: '',
    },
  });

  // Load current configuration
  useEffect(() => {
    if (currentConfig && open) {
      form.reset(currentConfig);
    }
  }, [currentConfig, open, form]);

  const onSubmit = async (data: GSTConfigForm) => {
    try {
      setIsLoading(true);
      
      // Validate GST rates
      if (data.enabled) {
        if (data.cgstRate + data.sgstRate !== data.defaultGSTRate) {
          toast({
            title: "Invalid GST Rates",
            description: "CGST + SGST should equal Default GST Rate",
            variant: "destructive",
          });
          return;
        }
      }

      await onSave(data);
      
      toast({
        title: "GST Configuration Saved",
        description: "Your GST settings have been updated successfully.",
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving GST config:', error);
      toast({
        title: "Error",
        description: "Failed to save GST configuration. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGSTToggle = (enabled: boolean) => {
    form.setValue('enabled', enabled);
    if (enabled && form.getValues('defaultGSTRate') === 0) {
      form.setValue('defaultGSTRate', 18);
      form.setValue('cgstRate', 9);
      form.setValue('sgstRate', 9);
      form.setValue('igstRate', 18);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>GST Configuration</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* GST Enable/Disable */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">Enable GST</Label>
              <p className="text-sm text-muted-foreground">
                Enable GST calculation and compliance for Indian tax requirements
              </p>
            </div>
            <Switch
              checked={form.watch('enabled')}
              onCheckedChange={handleGSTToggle}
            />
          </div>

          {form.watch('enabled') && (
            <>
              {/* Company Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Company Information</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="companyName">Company Name *</Label>
                    <Input
                      id="companyName"
                      {...form.register('companyName')}
                      placeholder="Your Company Name"
                    />
                    {form.formState.errors.companyName && (
                      <p className="text-sm text-red-500 mt-1">
                        {form.formState.errors.companyName.message}
                      </p>
                    )}
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="companyGSTNumber">GST Number *</Label>
                    <Input
                      id="companyGSTNumber"
                      {...form.register('companyGSTNumber')}
                      placeholder="22AAAAA0000A1Z5"
                      maxLength={15}
                      className="uppercase"
                      onChange={(e) => {
                        const value = e.target.value.toUpperCase();
                        form.setValue('companyGSTNumber', value);
                      }}
                    />
                    {form.formState.errors.companyGSTNumber && (
                      <p className="text-sm text-red-500 mt-1">
                        {form.formState.errors.companyGSTNumber.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Company Address */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Company Address</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="addressLine1">Address Line 1 *</Label>
                    <Input
                      id="addressLine1"
                      {...form.register('companyAddress.line1')}
                      placeholder="Building, Street, Area"
                    />
                    {form.formState.errors.companyAddress?.line1 && (
                      <p className="text-sm text-red-500 mt-1">
                        {form.formState.errors.companyAddress.line1.message}
                      </p>
                    )}
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="addressLine2">Address Line 2</Label>
                    <Input
                      id="addressLine2"
                      {...form.register('companyAddress.line2')}
                      placeholder="Landmark (Optional)"
                    />
                  </div>

                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      {...form.register('companyAddress.city')}
                      placeholder="City"
                    />
                    {form.formState.errors.companyAddress?.city && (
                      <p className="text-sm text-red-500 mt-1">
                        {form.formState.errors.companyAddress.city.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="state">State *</Label>
                    <Input
                      id="state"
                      {...form.register('companyAddress.state')}
                      placeholder="State"
                    />
                    {form.formState.errors.companyAddress?.state && (
                      <p className="text-sm text-red-500 mt-1">
                        {form.formState.errors.companyAddress.state.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="pincode">Pincode *</Label>
                    <Input
                      id="pincode"
                      {...form.register('companyAddress.pincode')}
                      placeholder="400001"
                      maxLength={6}
                    />
                    {form.formState.errors.companyAddress?.pincode && (
                      <p className="text-sm text-red-500 mt-1">
                        {form.formState.errors.companyAddress.pincode.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="stateCode">State Code *</Label>
                    <Input
                      id="stateCode"
                      {...form.register('stateCode')}
                      placeholder="27"
                      maxLength={2}
                      className="uppercase"
                    />
                    {form.formState.errors.stateCode && (
                      <p className="text-sm text-red-500 mt-1">
                        {form.formState.errors.stateCode.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* GST Rates */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">GST Rates (%)</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="defaultGSTRate">Default GST Rate</Label>
                    <Input
                      id="defaultGSTRate"
                      type="number"
                      step="0.01"
                      min="0"
                      max="30"
                      {...form.register('defaultGSTRate', { valueAsNumber: true })}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Standard rate for pet grooming services
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="igstRate">IGST Rate</Label>
                    <Input
                      id="igstRate"
                      type="number"
                      step="0.01"
                      min="0"
                      max="30"
                      {...form.register('igstRate', { valueAsNumber: true })}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      For inter-state transactions
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="cgstRate">CGST Rate</Label>
                    <Input
                      id="cgstRate"
                      type="number"
                      step="0.01"
                      min="0"
                      max="15"
                      {...form.register('cgstRate', { valueAsNumber: true })}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Central GST for intra-state
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="sgstRate">SGST Rate</Label>
                    <Input
                      id="sgstRate"
                      type="number"
                      step="0.01"
                      min="0"
                      max="15"
                      {...form.register('sgstRate', { valueAsNumber: true })}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      State GST for intra-state
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>Note:</strong> CGST + SGST should equal Default GST Rate. 
                    For most pet services in India, use 18% (9% CGST + 9% SGST).
                  </p>
                </div>
              </div>
            </>
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
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Configuration'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}