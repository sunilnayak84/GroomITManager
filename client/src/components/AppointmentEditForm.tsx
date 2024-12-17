import { useState } from "react";
import { useForm } from "react-hook-form";
import { useStaff } from "@/hooks/use-staff";
import { zodResolver } from "@hookform/resolvers/zod";
import { type AppointmentWithRelations } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { useServices } from "@/hooks/use-services";

const editAppointmentSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'completed', 'cancelled']),
  notes: z.string().optional(),
  appointmentDate: z.string(),
  appointmentTime: z.string(),
  services: z.array(z.string()),
  groomerId: z.string()
});

type EditAppointmentForm = z.infer<typeof editAppointmentSchema>;

interface AppointmentEditFormProps {
  appointment: AppointmentWithRelations;
  setOpen: (open: boolean) => void;
}

export default function AppointmentEditForm({ appointment, setOpen }: AppointmentEditFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { staffMembers } = useStaff();
  const availableGroomers = staffMembers?.filter(staff => staff.role === 'groomer') || [];
  const { updateAppointment } = useAppointments();
  const { toast } = useToast();
  const { services } = useServices();

  const appointmentDate = new Date(appointment.date);
  useEffect(() => {
    if (services && services.length > 0) {
      form.setValue('services', Array.isArray(appointment.services) ? [...appointment.services] : []);
    }
  }, [services]);

  const form = useForm<EditAppointmentForm>({
    resolver: zodResolver(editAppointmentSchema),
    defaultValues: {
      status: appointment.status,
      notes: appointment.notes || "",
      appointmentDate: appointmentDate.toISOString().split('T')[0],
      appointmentTime: appointmentDate.toTimeString().slice(0, 5),
      services: Array.isArray(appointment.services) ? [...appointment.services] : [],
      groomerId: appointment.groomerId
    },
  });

  // Placeholder for the actual isTimeSlotAvailable function.  Replace with your actual implementation.
  const isTimeSlotAvailable = (appointmentDate: Date, groomerId: string, duration: number): boolean => {
    //  This is a placeholder - replace with your actual logic to check time slot availability
    // Consider fetching data from a server to check for overlaps
    console.log("Checking time slot availability...", appointmentDate, groomerId, duration);
    return true; // Replace with actual availability check
  };


  const onSubmit = async (data: EditAppointmentForm) => {
    try {
      setIsSubmitting(true);
      const selectedServices = services?.filter(s => data.services.includes(s.service_id)) || [];
      const totalDuration = selectedServices.reduce((sum, s) => sum + (s.duration || 0), 0);
      const totalPrice = selectedServices.reduce((sum, s) => sum + (s.price || 0), 0);
      const appointmentDateTime = new Date(`${data.appointmentDate}T${data.appointmentTime}`);

      if (isNaN(appointmentDateTime.getTime())) {
        throw new Error("Invalid appointment date or time");
      }

      // Check if timeslot is available
      if (!isTimeSlotAvailable(appointmentDateTime, data.groomerId, totalDuration)) {
        toast({
          variant: "destructive",
          title: "Time Slot Not Available",
          description: "This time slot conflicts with another appointment. Please select a different time.",
        });
        return;
      }

      await updateAppointment({
        id: appointment.id,
        status: data.status,
        notes: data.notes || "",
        services: data.services,
        groomerId: data.groomerId,
        date: appointmentDateTime,
        totalDuration,
        totalPrice
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
        <DialogDescription>
          Update the appointment details below
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0">
            <img
              src={appointment.pet.image || `https://api.dicebear.com/7.x/adventurer/svg?seed=${appointment.pet.name}`}
              alt={appointment.pet.name}
              className="h-12 w-12 rounded-full"
            />
          </div>
          <div>
            <h4 className="text-sm font-medium">{appointment.pet.name}</h4>
            <p className="text-sm text-gray-500">{appointment.pet.breed}</p>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium">Customer</h4>
          <p className="text-sm text-gray-500">
            {appointment.customer.firstName} {appointment.customer.lastName}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="appointmentDate"
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
              name="appointmentTime"
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
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <FormControl>
                  <Input {...field} disabled readOnly />
                </FormControl>
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
                    {availableGroomers?.map((groomer) => (
                      <SelectItem 
                        key={groomer.id} 
                        value={groomer.id}
                      >
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
                <div className="space-y-2">
                  {services?.map((service) => (
                    <div key={service.service_id} className="flex items-center space-x-2">
                      <Checkbox
                        checked={field.value.includes(service.service_id)}
                        onCheckedChange={(checked) => {
                          const updatedServices = checked
                            ? [...field.value, service.service_id]
                            : field.value.filter((id) => id !== service.service_id);
                          field.onChange(updatedServices);
                        }}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{service.name}</div>
                        <div className="text-sm text-gray-500">
                          ₹{service.price} • {service.duration} minutes
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {field.value.length > 0 && (
                  <div className="mt-4 p-4 bg-secondary rounded-lg">
                    <div className="font-medium">Selected Services Summary</div>
                    <div className="text-sm text-gray-500">
                      Total Duration: {services?.filter(s => field.value.includes(s.service_id))
                        .reduce((sum, s) => sum + (s.duration || 0), 0)} minutes
                    </div>
                    <div className="text-sm text-gray-500">
                      Total Price: ₹{services?.filter(s => field.value.includes(s.service_id))
                        .reduce((sum, s) => sum + (s.price || 0), 0)}
                    </div>
                  </div>
                )}
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

          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Updating..." : "Update Appointment"}
            </Button>
          </div>
        </form>
      </Form>
    </DialogContent>
  );
}