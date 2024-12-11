import { useState } from "react";
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
import { usePets } from "../hooks/use-pets";
import { useToast } from "@/hooks/use-toast";
import { useServices } from '../hooks/use-services'; // Import the hook for services

export default function AppointmentForm() {
  const { addAppointment } = useAppointments();
  const { pets } = usePets();
  const { services } = useServices(); // Get services data
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultGroomerId = "1";
  const defaultBranchId = "1";
  const form = useForm<z.infer<typeof insertAppointmentSchema>>({
    resolver: zodResolver(insertAppointmentSchema),
    defaultValues: {
      petId: "",
      serviceId: "1", // Default service ID
      groomerId: defaultGroomerId,
      branchId: defaultBranchId,
      date: (() => {
        const date = new Date();
        date.setMinutes(date.getMinutes() + 15); // Set default time to 15 minutes from now, in 15 min increments
        date.setMinutes(Math.round(date.getMinutes() / 15) * 15); //Round to nearest 15min
        return date.toISOString();
      })(),
      status: "pending",
      notes: "",
      productsUsed: null
    },
  });

  async function onSubmit(values: z.infer<typeof insertAppointmentSchema>): Promise<void> {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      // Validate required fields
      if (!values.petId) {
        throw new Error("Please select a pet");
      }
      if (!values.serviceId) {
        throw new Error("Please select a service");
      }

      // Ensure the date is valid before proceeding
      const appointmentDate = new Date(values.date);
      if (isNaN(appointmentDate.getTime())) {
        throw new Error("Invalid appointment date");
      }

      // Validate that the appointment is not in the past
      const now = new Date();
      if (appointmentDate < now) {
        throw new Error("Appointment date must be in the future");
      }

      // Validate and prepare the appointment data
      const data: z.infer<typeof insertAppointmentSchema> = {
        petId: values.petId,
        serviceId: values.serviceId, 
        groomerId: values.groomerId,
        branchId: values.branchId,
        date: appointmentDate.toISOString(),
        status: 'pending',
        notes: values.notes || null,
        productsUsed: null 
      };

      console.log('Submitting appointment data:', data);
      await addAppointment(data);
      
      toast({
        title: "Success",
        description: "Appointment scheduled successfully",
      });
      
      form.reset(); // Reset form after successful submission
    } catch (error) {
      console.error('Failed to schedule appointment:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to schedule appointment",
      });
      throw error;
    } finally {
      setIsSubmitting(false);
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
                    step="900"
                    min={new Date().toISOString().slice(0, 16)}
                    {...field}
                    value={field.value || ''}
                    onChange={(e) => {
                      const date = new Date(e.target.value);
                      if (!isNaN(date.getTime())) {
                        field.onChange(e.target.value);
                      }
                    }}
                    onBlur={(e) => {
                      const date = new Date(e.target.value);
                      if (isNaN(date.getTime())) {
                        field.onChange('');
                      }
                    }}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="serviceId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Service Type</FormLabel>
                <Select onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a service" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(services || []).map((service) => (
                      <SelectItem key={service.service_id} value={service.service_id}>
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
                  <Input {...field} value={field.value ?? ''} />
                </FormControl>
              </FormItem>
            )}
          />
          <Button 
            type="submit" 
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Scheduling..." : "Schedule Appointment"}
          </Button>
        </form>
      </Form>
    </DialogContent>
  );
}