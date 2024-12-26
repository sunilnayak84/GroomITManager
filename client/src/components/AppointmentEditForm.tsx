
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { appointmentSchema, type AppointmentWithRelations } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppointments } from "../hooks/use-appointments";
import { useToast } from "@/hooks/use-toast";

interface AppointmentEditFormProps {
  appointment: AppointmentWithRelations;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function AppointmentEditForm({ appointment, setOpen }: AppointmentEditFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { updateAppointment } = useAppointments();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof appointmentSchema>>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      status: appointment.status,
      notes: appointment.notes || undefined,
      productsUsed: appointment.productsUsed || undefined,
    },
  });

  async function onSubmit(data: z.infer<typeof appointmentSchema>) {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      await updateAppointment(appointment.id, data);
      setOpen(false);
      toast({
        title: "Success",
        description: "Appointment updated successfully",
      });
    } catch (error) {
      console.error('Failed to update appointment:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update appointment",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Edit Appointment</DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
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
                  <Input {...field} value={field.value || ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button 
            type="submit" 
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Updating..." : "Update Appointment"}
          </Button>
        </form>
      </Form>
    </DialogContent>
  );
}
