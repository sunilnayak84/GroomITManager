import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertAppointmentSchema, type InsertAppointment } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import {
  Dialog,
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

  const defaultGroomerId = "1";
  const defaultBranchId = "1";
  const form = useForm<z.infer<typeof insertAppointmentSchema>>({
    resolver: zodResolver(insertAppointmentSchema),
    defaultValues: {
      petId: "",
      serviceId: "",
      groomerId: defaultGroomerId,
      branchId: defaultBranchId,
      date: (() => {
        const date = new Date();
        date.setMinutes(date.getMinutes() + 30); // Set default time to 30 minutes from now
        return date.toISOString();
      })(),
      status: "pending",
      notes: "",
      productsUsed: null
    },
  });

  async function onSubmit(values: z.infer<typeof insertAppointmentSchema>) {
    try {
      const data: z.infer<typeof insertAppointmentSchema> = {
        ...values,
        petId: String(values.petId),
        serviceId: String(values.serviceId),
        branchId: String(values.branchId),
        status: 'pending',
        date: new Date(values.date).toISOString(),
        notes: values.notes || null,
        productsUsed: values.productsUsed || null
      };

      await addAppointment(data);
      toast({
        title: "Success",
        description: "Appointment scheduled successfully",
      });
    } catch (error) {
      console.error('Failed to schedule appointment:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to schedule appointment",
      });
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Schedule Appointment</DialogTitle>
        <DialogDescription>
          Book a new appointment for pet grooming services.
        </DialogDescription>
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
                  onValueChange={(value) => field.onChange(value)}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a pet" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(pets || []).map((pet) => (
                      <SelectItem 
                        key={pet.id} 
                        value={String(pet.id)}
                      >
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
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date & Time</FormLabel>
                <FormControl>
                  <Input 
                    type="datetime-local" 
                    {...field}
                    value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ''}
                    onChange={(e) => {
                      const date = new Date(e.target.value);
                      field.onChange(date.toISOString());
                    }}
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
