import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useInventory } from "@/hooks/use-inventory";
import { useUser } from "@/hooks/use-user";
import { toast } from "@/components/ui/use-toast";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const usageFormSchema = z.object({
  quantity_used: z.number().min(0, "Usage quantity must be positive"),
  service_id: z.string().optional(),
  appointment_id: z.string().optional(),
  notes: z.string().optional(),
  item_id: z.string(),
});

type UsageFormData = z.infer<typeof usageFormSchema>;

interface ConsumablesUsageModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedService?: any;
  selectedCategory?: string;
  appointmentId: string;
  serviceId?: string;
}

export function ConsumablesUsageModal({
  isOpen,
  onClose,
  selectedService,
  selectedCategory,
  appointmentId,
  serviceId
}: ConsumablesUsageModalProps) {
  const { inventory, recordUsage } = useInventory();
  const { user } = useUser();
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const filteredItems = inventory?.filter(item => 
    !selectedCategory || item.category === selectedCategory
  ) || [];

  const form = useForm<UsageFormData>({
    resolver: zodResolver(usageFormSchema),
    defaultValues: {
      quantity_used: 0,
      notes: "",
    },
  });

  async function onSubmit(data: UsageFormData) {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to record usage",
        variant: "destructive",
      });
      return;
    }

    const selectedItem = inventory?.find(item => item.item_id === data.item_id);
    if (!selectedItem) {
      toast({
        title: "Error",
        description: "Selected item not found",
        variant: "destructive",
      });
      return;
    }

    if (data.quantity_used > selectedItem.quantity) {
      toast({
        title: "Error",
        description: `Cannot use more than available quantity (${selectedItem.quantity} ${selectedItem.unit})`,
        variant: "destructive",
      });
      return;
    }

    try {
      await recordUsage({
        item_id: data.item_id,
        quantity_used: data.quantity_used,
        service_id: serviceId,
        appointment_id: appointmentId,
        used_by: user.id,
        notes: data.notes,
        service_linked: !!serviceId,
        auto_deducted: true
      });

      onClose();
      form.reset();
    } catch (error) {
      console.error('Error recording usage:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to record usage",
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Record Usage {selectedService ? `- ${selectedService.name}` : ''} 
            {selectedCategory ? ` (${selectedCategory})` : ''}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="item_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Item</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      setSelectedItem(inventory?.find(item => item.item_id === value));
                    }}
                    value={field.value}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an item" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredItems.map((item) => (
                        <SelectItem key={item.item_id} value={item.item_id}>
                          {item.name} ({item.quantity} {item.unit} available)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="quantity_used"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity Used {selectedItem?.unit ? `(${selectedItem.unit})` : ''}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      max={selectedItem?.quantity}
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Optional usage notes" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">Record Usage</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}