
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useStaff } from "@/hooks/use-staff";
import { zodResolver } from "@hookform/resolvers/zod";
import { type AppointmentWithRelations } from "@/lib/schema";
import { Button } from "@/components/ui/button";
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

const editAppointmentSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'completed', 'cancelled']),
  notes: z.string().optional(),
  appointmentDate: z.string(),
  appointmentTime: z.string(),
});

type EditAppointmentForm = z.infer<typeof editAppointmentSchema>;

interface AppointmentEditFormProps {
  appointment: AppointmentWithRelations;
  setOpen: (open: boolean) => void;
}

export default function AppointmentEditForm({ appointment, setOpen }: AppointmentEditFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { staff } = useStaff();
  const availableGroomers = staff?.filter(s => s.isGroomer) || [];
  const { updateAppointment } = useAppointments();
  const { toast } = useToast();

  const appointmentDate = new Date(appointment.date);
  const form = useForm<EditAppointmentForm>({
    resolver: zodResolver(editAppointmentSchema),
    defaultValues: {
      status: appointment.status,
      notes: appointment.notes || "",
      appointmentDate: appointmentDate.toISOString().split('T')[0],
      appointmentTime: appointmentDate.toTimeString().slice(0, 5),
    },
  });

  const onSubmit = async (data: EditAppointmentForm) => {
    try {
      setIsSubmitting(true);
      await updateAppointment({
        id: appointment.id,
        status: data.status,
        notes: data.notes || "",
        appointmentDate: data.appointmentDate,
        appointmentTime: data.appointmentTime,
        totalDuration: appointment.totalDuration,
        totalPrice: appointment.totalPrice
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

        <div>
          <h4 className="text-sm font-medium">Services</h4>
          <div className="mt-1 space-y-1">
            {appointment.service?.map((service, index) => (
              <div key={index} className="text-sm text-gray-500">
                {service.name} - {service.duration}min - ₹{service.price}
              </div>
            ))}
          </div>
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
                <Select onValueChange={field.onChange} value={appointment.groomerId}>
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
