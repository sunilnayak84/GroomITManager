
import { useState } from 'react';
import { Dialog, DialogContent } from "./ui/dialog";
import { Button } from "./ui/button";
import { useForm } from 'react-hook-form';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Form, FormControl, FormField, FormItem, FormMessage } from "./ui/form";
import { AppointmentWithRelations } from '@/lib/schema';
import { format } from 'date-fns';

interface AppointmentDetailsProps {
  appointment: AppointmentWithRelations;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
}

const AppointmentDetails = ({ appointment, open, onOpenChange, onEdit }: AppointmentDetailsProps) => {
  const [status, setStatus] = useState(appointment.status);
  const form = useForm({
    defaultValues: {
      status: appointment.status
    }
  });

  const onStatusChange = (value: string) => {
    setStatus(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Appointment Details</h2>
          
          <div className="grid gap-4">
            <div className="space-y-2">
              <h3 className="font-medium">Time</h3>
              <p>{format(new Date(appointment.startTime), 'PPp')} - {format(new Date(appointment.endTime), 'p')}</p>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium">Pet</h3>
              <p>{appointment.pet?.name} ({appointment.pet?.breed})</p>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium">Customer</h3>
              <p>{appointment.customer?.name}</p>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium">Groomer</h3>
              <p>{appointment.groomer?.name}</p>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium">Services</h3>
              <ul className="list-disc list-inside">
                {appointment.services.map((service, index) => (
                  <li key={index}>{service.name} - ₹{service.price}</li>
                ))}
              </ul>
            </div>

            <Form {...form}>
              <form className="space-y-4">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <h3 className="font-medium mb-2">Status</h3>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          onStatusChange(value);
                        }}
                        value={field.value}
                        disabled={appointment.status === 'completed' || appointment.status === 'cancelled'}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="confirmed">Confirmed</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AppointmentDetails;
