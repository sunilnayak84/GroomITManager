import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
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
import { format } from "date-fns";

const editAppointmentSchema = z.object({
  status: z.enum(["pending", "confirmed", "completed", "cancelled", "in_progress"]),
  notes: z.string().nullable().optional(),
  groomerId: z.string(),
  services: z.array(z.string()),
  date: z.string(),
  time: z.string(),
  cancellationReason: z.enum(["no_show", "rescheduled", "other"]).nullable().optional()
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
  const availableGroomers = staffMembers?.filter(user => user.specialties?.includes('groomer') && user.isActive) || [];

  const appointmentDate = new Date(appointment.date);
  const formattedDate = format(appointmentDate, "yyyy-MM-dd");
  const formattedTime = format(appointmentDate, "HH:mm");

  const form = useForm({
    resolver: zodResolver(editAppointmentSchema),
    defaultValues: {
      status: appointment.status,
      notes: appointment.notes || undefined,
      groomerId: appointment.groomerId,
      services: appointment.services || [],
      date: formattedDate,
      time: formattedTime,
      cancellationReason: appointment.cancellationReason
    },
  });

  async function onSubmit(data: z.infer<typeof editAppointmentSchema>) {
    try {
      const dateTime = new Date(`${data.date}T${data.time}`);
      await updateAppointment({
        id: appointment.id,
        status: data.status,
        notes: data.notes || undefined,
        cancellationReason: data.status === 'cancelled' ? data.cancellationReason || undefined : undefined,
        groomerId: data.groomerId,
        services: data.services,
        date: dateTime.toISOString()
      });

      toast({
        variant: "default",
        title: "Success",
        description: `Appointment status updated to ${data.status}`,
        className: "bg-white",
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
        <DialogDescription>
          Update appointment details for pet grooming services.
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
          </div>

          <FormField
            control={form.control}
            name="services"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Services</FormLabel>
                <div className="space-y-2">
                  {(services || []).map((service) => (
                    <div key={service.service_id} className="flex items-center space-x-2">
                      <Checkbox
                        checked={field.value.includes(service.service_id)}
                        onCheckedChange={(checked) => {
                          const serviceId = service.service_id;
                          const updatedServices = checked
                            ? [...field.value, serviceId]
                            : field.value.filter((id) => id !== serviceId);
                          field.onChange(updatedServices);
                        }}
                      />
                      <div>
                        <p className="font-medium">{service.name}</p>
                        <p className="text-sm text-gray-500">₹{service.price} • {service.duration} minutes</p>
                      </div>
                    </div>
                  ))}
                </div>
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
                <Select onValueChange={field.onChange} value={field.value}>
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
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
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

          {form.watch("status") === "cancelled" && (
            <FormField
              control={form.control}
              name="cancellationReason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cancellation Reason</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select reason for cancellation" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="no_show">No Show</SelectItem>
                      <SelectItem value="rescheduled">Rescheduled</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

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