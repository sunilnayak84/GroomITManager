import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertAppointmentSchema, type InsertAppointment } from "@db/schema";
import { useServices } from "../hooks/use-services";
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
import { usePets } from "../hooks/use-pets";
import { useToast } from "@/hooks/use-toast";

export default function AppointmentForm() {
  const { addAppointment } = useAppointments();
  const { pets } = usePets();
  const { toast } = useToast();

  const defaultGroomerId = 1;
  const form = useForm<InsertAppointment>({
    resolver: zodResolver(insertAppointmentSchema),
    defaultValues: {
      petId: 0,
      serviceId: 0,
      groomerId: defaultGroomerId,
      branchId: 1,
      date: new Date(),
      status: "pending",
      notes: "",
      productsUsed: null,
    },
  });

  async function onSubmit(values: InsertAppointment) {
    try {
      const data: InsertAppointment = {
        ...values,
        status: 'pending' as const,
        date: new Date(values.date)
      };
      await addAppointment(data);
      toast({
        title: "Success",
        description: "Appointment scheduled successfully",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to schedule appointment",
      });
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Schedule Appointment</DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="petId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pet</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(parseInt(value))}
                  defaultValue={field.value.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a pet" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(pets || []).map((pet) => (
                      <SelectItem key={pet.id} value={pet.id.toString()}>
                        {pet.name} - {pet.breed}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="serviceId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Service</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(parseInt(value))}
                  defaultValue={field.value.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a service" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {services?.map((service) => (
                      <SelectItem key={service.id} value={service.id.toString()}>
                        {service.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date & Time</FormLabel>
                <FormControl>
                  <Input 
                    type="datetime-local" 
                    {...field}
                    value={field.value.toISOString().slice(0, 16)}
                    onChange={(e) => field.onChange(new Date(e.target.value))}
                  />
                </FormControl>
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
                  <Input {...field} value={field.value ?? ''} />
                </FormControl>
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full">
            Schedule Appointment
          </Button>
        </form>
      </Form>
    </DialogContent>
  );
}
