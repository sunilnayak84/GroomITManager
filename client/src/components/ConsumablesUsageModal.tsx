import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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

const usageFormSchema = z.object({
  quantity_used: z.number().min(0, "Usage quantity must be positive"),
  service_id: z.string().optional(),
  appointment_id: z.string().optional(),
  notes: z.string().optional(),
});

type UsageFormData = z.infer<typeof usageFormSchema>;

interface ConsumablesUsageModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  itemName: string;
  currentQuantity: number;
  unit: string;
}

export function ConsumablesUsageModal({
  isOpen,
  onClose,
  itemId,
  itemName,
  currentQuantity,
  unit,
}: ConsumablesUsageModalProps) {
  const { recordUsage } = useInventory();
  const { user } = useUser();

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

    if (data.quantity_used > currentQuantity) {
      toast({
        title: "Error",
        description: `Cannot use more than available quantity (${currentQuantity} ${unit})`,
        variant: "destructive",
      });
      return;
    }

    try {
      await recordUsage({
        item_id: itemId,
        quantity_used: data.quantity_used,
        service_id: data.service_id,
        appointment_id: data.appointment_id,
        used_by: user.id,
        notes: data.notes,
        service_linked: !!data.service_id, // true if service_id is provided
        auto_deducted: true // Since this is being recorded through the UI
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
          <DialogTitle>Record Usage - {itemName}</DialogTitle>
          <DialogDescription>
            Current stock: {currentQuantity} {unit}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="quantity_used"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity Used ({unit})</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      max={currentQuantity}
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
