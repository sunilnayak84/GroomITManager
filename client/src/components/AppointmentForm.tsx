import { useState, useEffect } from "react";
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
import { useServices } from '../hooks/use-services';
import { useStaff } from '../hooks/use-staff';
import { useWorkingHours } from '../hooks/use-working-hours';

interface AppointmentFormProps {
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function AppointmentForm({ setOpen }: AppointmentFormProps) {
  const { addAppointment, isTimeSlotAvailable } = useAppointments();
  const { pets } = usePets();
  const { services } = useServices();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { staffMembers, isLoading: isLoadingStaff } = useStaff();
  console.log('Staff members:', staffMembers); // Debug log
  const availableGroomers = staffMembers.filter((user) => {
    console.log('Checking user:', user); // Debug log
    return user.isGroomer === true && user.isActive === true;
  });
  
  const { workingHours } = useWorkingHours();
  const [selectedService, setSelectedService] = useState<{ duration: number } | null>(null);
  
  const form = useForm<z.infer<typeof insertAppointmentSchema>>({
    resolver: zodResolver(insertAppointmentSchema),
    defaultValues: {
      petId: "",
      serviceId: "",
      groomerId: "",
      branchId: "1",
      date: (() => {
        const date = new Date();
        date.setMinutes(date.getMinutes() + 15);
        date.setMinutes(Math.round(date.getMinutes() / 15) * 15);
        return date.toISOString();
      })(),
      status: "pending" as const,
      notes: null,
      productsUsed: null
    },
  });
  
  // Update selected service when serviceId changes
  useEffect(() => {
    const serviceId = form.watch("serviceId");
    if (serviceId) {
      const service = services?.find(s => s.service_id === serviceId);
      setSelectedService(service || null);
    } else {
      setSelectedService(null);
    }
  }, [form.watch("serviceId"), services]);

  async function onSubmit(values: InsertAppointment) {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      if (!values.petId || !values.serviceId) {
        throw new Error("Please select both pet and service");
      }

      const appointmentDate = new Date(values.date);
      if (isNaN(appointmentDate.getTime())) {
        throw new Error("Invalid appointment date");
      }

      const now = new Date();
      if (appointmentDate < now) {
        throw new Error("Appointment date must be in the future");
      }

      appointmentDate.setMinutes(Math.round(appointmentDate.getMinutes() / 15) * 15);
      appointmentDate.setSeconds(0);
      appointmentDate.setMilliseconds(0);

      if (!values.groomerId) {
        throw new Error("Please select a groomer");
      }

      const appointmentData: InsertAppointment = {
        petId: values.petId,
        serviceId: values.serviceId,
        groomerId: values.groomerId,
        branchId: "1", // Default branch ID
        date: appointmentDate.toISOString(),
        status: "pending" as const,
        notes: values.notes || null,
        productsUsed: null
      };

      console.log('Submitting appointment data:', appointmentData);
      await addAppointment(appointmentData);
      setOpen(false);
      
      toast({
        title: "Success",
        description: "Appointment scheduled successfully",
      });
      
      form.reset();
    } catch (error) {
      console.error('Failed to schedule appointment:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to schedule appointment",
      });
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
                  onValueChange={field.onChange}
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
                        key={String(pet.id)} 
                        value={String(pet.id)}
                      >
                        {pet.name} - {pet.breed}
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
                    value={field.value?.slice(0, 16) || ''}
                    onChange={(e) => {
                      try {
                        let date = new Date(e.target.value);
                        if (!isNaN(date.getTime())) {
                          // Round to nearest 15 minutes
                          const minutes = Math.round(date.getMinutes() / 15) * 15;
                          date.setMinutes(minutes);
                          date.setSeconds(0);
                          date.setMilliseconds(0);
                          
                          // Get day of week (0-6, Sunday-Saturday)
                          const dayOfWeek = date.getDay();
                          const selectedGroomerId = form.getValues("groomerId");
                          
                          // Check working hours for the selected day
                          const daySchedule = workingHours?.find(
                            (schedule) => schedule.dayOfWeek === dayOfWeek
                          );
                          
                          if (!daySchedule || !daySchedule.isOpen) {
                            toast({
                              title: "Invalid Day",
                              description: "The selected day is not a working day",
                              variant: "destructive"
                            });
                            return;
                          }
                          
                          const appointmentHour = date.getHours();
                          const appointmentMinutes = date.getMinutes();
                          const appointmentTime = `${appointmentHour.toString().padStart(2, '0')}:${appointmentMinutes.toString().padStart(2, '0')}`;
                          
                          const openingTime = daySchedule.openingTime;
                          const closingTime = daySchedule.closingTime;
                          
                          // Check if appointment is within working hours
                          if (appointmentTime < openingTime || appointmentTime >= closingTime) {
                            toast({
                              title: "Invalid Time",
                              description: `Please select a time between ${openingTime} and ${closingTime}`,
                              variant: "destructive"
                            });
                            return;
                          }
                          
                          // Check if appointment fits before closing time
                          if (selectedService) {
                            const appointmentEndTime = new Date(date);
                            appointmentEndTime.setMinutes(
                              appointmentEndTime.getMinutes() + selectedService.duration
                            );
                            const endHour = appointmentEndTime.getHours();
                            const endMinutes = appointmentEndTime.getMinutes();
                            const endTimeStr = `${endHour.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
                            
                            if (endTimeStr > closingTime) {
                              toast({
                                title: "Invalid Time",
                                description: "The appointment duration exceeds closing time",
                                variant: "destructive"
                              });
                              return;
                            }
                          }
                          
                          // Check break time if exists
                          if (daySchedule.breakStart && daySchedule.breakEnd) {
                            const isInBreakTime = appointmentTime >= daySchedule.breakStart && 
                                                appointmentTime < daySchedule.breakEnd;
                            if (isInBreakTime) {
                              toast({
                                title: "Invalid Time",
                                description: `Break time is between ${daySchedule.breakStart} and ${daySchedule.breakEnd}`,
                                variant: "destructive"
                              });
                              return;
                            }
                          }
                          
                          if (selectedGroomerId && !isTimeSlotAvailable(date, selectedGroomerId)) {
                            toast({
                              title: "Time Slot Unavailable",
                              description: "This time slot is already booked. Please select another time.",
                              variant: "destructive"
                            });
                            return;
                          }
                          
                          // Format the date string in the required format
                          const formattedDate = date.toISOString();
                          field.onChange(formattedDate);
                        }
                      } catch (error) {
                        console.error('Error processing date:', error);
                        toast({
                          title: "Invalid Date",
                          description: "Please enter a valid date and time",
                          variant: "destructive"
                        });
                      }
                    }}
                    onBlur={(e) => {
                      if (!e.target.value) {
                        field.onChange('');
                      }
                    }}
                  />
                </FormControl>
                <FormMessage />
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
                      <SelectItem 
                        key={String(service.service_id)} 
                        value={String(service.service_id)}
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
                      <SelectItem 
                        key={groomer.id} 
                        value={groomer.id}
                        disabled={!groomer.isActive || (groomer.maxDailyAppointments !== undefined && groomer.maxDailyAppointments <= 0)}
                      >
                        {groomer.name}
                        {!groomer.isActive ? " (Inactive)" : 
                         (groomer.maxDailyAppointments !== undefined && groomer.maxDailyAppointments <= 0) ? " (Fully Booked)" : ""}
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
                <FormMessage />
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
