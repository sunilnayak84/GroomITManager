
import { useState } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "./ui/form";
import { Input } from "./ui/input";
import { useForm } from "react-hook-form";
import { useInventory } from "@/hooks/use-inventory";
import { useToast } from "./ui/use-toast";

interface ConsumableUsage {
  itemId: string;
  quantity: number;
}

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
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    defaultValues: {
      consumables: [] as ConsumableUsage[],
    },
  });

  const handleSubmit = async (data: { consumables: ConsumableUsage[] }) => {
    setIsSubmitting(true);
    try {
      // Record usage for each consumable
      await Promise.all(
        data.consumables.map((usage) =>
          recordUsage({
            item_id: usage.itemId,
            quantity_used: usage.quantity,
            service_id: serviceId,
            appointment_id: appointmentId,
            notes: `Used in appointment ${appointmentId}`,
          })
        )
      );
      
      onComplete();
      onClose();
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
          <DialogTitle>Complete Appointment</DialogTitle>
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
                        onChange={(e) =>
                          field.onChange(Number(e.target.value))
                        }
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            ))}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Completing..." : "Complete Appointment"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
