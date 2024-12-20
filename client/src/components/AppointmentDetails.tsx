
import { AppointmentCompletionForm } from "./AppointmentCompletionForm";
import { Dialog, DialogContent } from "./ui/dialog";
import { Button } from "./ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Form, FormControl, FormField, FormItem } from "./ui/form";

// ... rest of your imports

const AppointmentDetails = ({ appointment, form, onStatusChange }) => {
  return (
    <FormField
      name="status"
      control={form.control}
      render={({ field }) => (
        <FormItem>
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
        </FormItem>
      )}
    />
  );
};

export default AppointmentDetails;
