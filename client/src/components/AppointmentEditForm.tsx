
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { useAppointments } from "@/hooks/use-appointments";
import { useToast } from "@/hooks/use-toast";
import { useServices } from "@/hooks/use-services";
import { useStaff } from "@/hooks/use-staff";
import type { AppointmentWithRelations } from "@/lib/schema";

const editAppointmentSchema = z.object({
  status: z.enum(["pending", "confirmed", "completed", "cancelled"]),
  notes: z.string().nullable(),
  groomerId: z.string(),
  services: z.array(z.string()),
});

interface AppointmentEditFormProps {
  appointment: AppointmentWithRelations;
  setOpen: (open: boolean) => void;
}

export default function AppointmentEditForm({ appointment, setOpen }: AppointmentEditFormProps) {
  const { updateAppointment } = useAppointments();
  const { toast } = useToast();
  const { services } = useServices();
  const { staffMembers } = useStaff();
  const availableGroomers = staffMembers.filter(user => user.isGroomer && user.isActive);

  const form = useForm({
    resolver: zodResolver(editAppointmentSchema),
    defaultValues: {
      status: appointment.status,
      notes: appointment.notes,
      groomerId: appointment.groomerId,
      services: appointment.service?.map(s => s.service_id.toString()) || [],
    },
  });

  async function onSubmit(data: z.infer<typeof editAppointmentSchema>) {
    try {
      await updateAppointment(appointment.id, {
        ...data,
        date: appointment.date,
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
            name="groomerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Groomer</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a groomer" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {availableGroomers.map((groomer) => (
                      <SelectItem key={groomer.id} value={groomer.id}>
                        {groomer.name}
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
            name="services"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Services</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange([...field.value, value])}
                  value={field.value[field.value.length - 1]}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select services" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {services?.map((service) => (
                      <SelectItem 
                        key={service.service_id} 
                        value={service.service_id.toString()}
                      >
                        {service.name}
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

          <Button type="submit" className="w-full">
            Update Appointment
          </Button>
        </form>
      </Form>
    </DialogContent>
  );
}
