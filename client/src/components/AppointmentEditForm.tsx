
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { type AppointmentWithRelations } from "@/lib/schema";
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
import { useAppointments } from "@/hooks/use-appointments";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const editAppointmentSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'completed', 'cancelled']),
  notes: z.string().optional(),
  date: z.string(),
  time: z.string(),
});

type EditAppointmentForm = z.infer<typeof editAppointmentSchema>;

interface AppointmentEditFormProps {
  appointment: AppointmentWithRelations;
  setOpen: (open: boolean) => void;
}

export default function AppointmentEditForm({ appointment, setOpen }: AppointmentEditFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { updateAppointment } = useAppointments();
  const { toast } = useToast();

  const appointmentDate = new Date(appointment.date);
  
  const form = useForm<EditAppointmentForm>({
    resolver: zodResolver(editAppointmentSchema),
    defaultValues: {
      status: appointment.status,
      notes: appointment.notes || "",
      date: appointmentDate.toISOString().split('T')[0],
      time: appointmentDate.toTimeString().slice(0, 5),
    },
  });

  const onSubmit = async (data: EditAppointmentForm) => {
    try {
      setIsSubmitting(true);
      const combinedDate = new Date(`${data.date}T${data.time}`);
      
      await updateAppointment({
        id: appointment.id,
        status: data.status,
        notes: data.notes,
        date: combinedDate.toISOString(),
      });
      
      toast({
        title: "Success",
        description: "Appointment updated successfully",
      });
      setOpen(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update appointment",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Edit Appointment</DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Time</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

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
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button 
            type="submit"
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? "Updating..." : "Update Appointment"}
          </Button>
        </form>
      </Form>
    </DialogContent>
  );
}