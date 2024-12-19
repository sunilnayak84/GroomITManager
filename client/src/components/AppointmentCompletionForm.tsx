
import { useState } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "./ui/form";
import { Input } from "./ui/input";
import { useForm } from "react-hook-form";
import { useInventory } from "@/hooks/use-inventory";
import { useToast } from "./ui/use-toast";
import { useUser } from "@/hooks/use-user";

interface AppointmentCompletionFormProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: string;
  serviceId: string;
  onComplete: () => void;
}

export function AppointmentCompletionForm({
  isOpen,
  onClose,
  appointmentId,
  serviceId,
  onComplete,
}: AppointmentCompletionFormProps) {
  const { inventory, recordUsage } = useInventory();
  const { user } = useUser();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    defaultValues: {
      consumables: {} as Record<string, number>,
    },
  });

  const handleSubmit = async (data: { consumables: Record<string, number> }) => {
    setIsSubmitting(true);
    try {
      // Record usage for each consumable with non-zero quantity
      await Promise.all(
        Object.entries(data.consumables)
          .filter(([_, quantity]) => quantity > 0)
          .map(([itemId, quantity]) =>
            recordUsage({
              item_id: itemId,
              quantity_used: quantity,
              service_id: serviceId,
              appointment_id: appointmentId,
              used_by: user?.uid || '',
              notes: `Used in appointment ${appointmentId}`,
            })
          )
      );
      
      onComplete();
      toast({
        title: "Success",
        description: "Appointment completed and inventory updated",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to record inventory usage",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Inventory Usage</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {inventory.map((item) => (
              <FormField
                key={item.item_id}
                name={`consumables.${item.item_id}`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{item.name}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder={`Quantity used (${item.unit})`}
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            ))}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? "Recording..." : "Complete Appointment"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
