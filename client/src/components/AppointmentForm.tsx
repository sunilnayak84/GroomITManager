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
import type { WorkingDays } from "@/lib/schema";

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
  const availableGroomers = staffMembers.filter(user => user.isGroomer && user.isActive);
  
  const { data: workingHours } = useWorkingHours();
  const [selectedService, setSelectedService] = useState<{ duration: number } | null>(null);
  
  const form = useForm<z.infer<typeof insertAppointmentSchema>>({
    resolver: zodResolver(insertAppointmentSchema),
    defaultValues: {
      petId: "",
      serviceId: "",
      groomerId: "",
      branchId: "1",
      appointmentDate: (() => {
        const date = new Date();
        return date.toISOString().split('T')[0];
      })(),
      appointmentTime: (() => {
        const date = new Date();
        date.setMinutes(Math.round(date.getMinutes() / 15) * 15);
        return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
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

  const validateTimeSlot = (
    date: string,
    time: string,
    daySchedule: WorkingDays | undefined
  ): { isValid: boolean; error?: string } => {
    if (!daySchedule || !daySchedule.isOpen) {
      return { isValid: false, error: "This day is not available for appointments" };
    }

    // Check if time is within working hours
    if (time < daySchedule.openingTime || time >= daySchedule.closingTime) {
      return {
        isValid: false,
        error: `Please select a time between ${daySchedule.openingTime} and ${daySchedule.closingTime}`
      };
    }

    // Check break time if exists
    if (daySchedule.breakStart && daySchedule.breakEnd) {
      if (time >= daySchedule.breakStart && time < daySchedule.breakEnd) {
        return {
          isValid: false,
          error: `Break time is between ${daySchedule.breakStart} and ${daySchedule.breakEnd}`
        };
      }
    }

    // Check if appointment fits before closing time
    if (selectedService) {
      const [hours, minutes] = time.split(':').map(Number);
      const appointmentEndTime = new Date(date);
      appointmentEndTime.setHours(hours);
      appointmentEndTime.setMinutes(minutes + selectedService.duration);
      const endTimeStr = `${String(appointmentEndTime.getHours()).padStart(2, '0')}:${String(appointmentEndTime.getMinutes()).padStart(2, '0')}`;
      
      if (endTimeStr > daySchedule.closingTime) {
        return {
          isValid: false,
          error: "The appointment duration exceeds closing time"
        };
      }
    }

    return { isValid: true };
  };

  async function onSubmit(values: InsertAppointment) {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      if (!values.petId || !values.serviceId) {
        throw new Error("Please select both pet and service");
      }

      const { appointmentDate, appointmentTime } = values;
      const [hours, minutes] = appointmentTime.split(':').map(Number);
      const fullDateTime = new Date(appointmentDate);
      fullDateTime.setHours(hours, minutes, 0, 0);
      
      if (isNaN(fullDateTime.getTime())) {
        throw new Error("Invalid appointment date and time");
      }

      const now = new Date();
      if (fullDateTime < now) {
        throw new Error("Appointment must be in the future");
      }

      if (!values.groomerId) {
        throw new Error("Please select a groomer");
      }

      // Validate against working hours
      const dayOfWeek = fullDateTime.getDay();
      const daySchedule = workingHours?.find(
        (schedule) => schedule.dayOfWeek === dayOfWeek
      );

      const validation = validateTimeSlot(appointmentDate, appointmentTime, daySchedule);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      const appointmentData: InsertAppointment = {
        petId: values.petId,
        serviceId: values.serviceId,
        groomerId: values.groomerId,
        branchId: "1", // Default branch ID
        date: fullDateTime.toISOString(),
        status: "pending" as const,
        notes: values.notes || null,
        productsUsed: null
      };

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
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="appointmentDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input 
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      {...field}
                      onChange={(e) => {
                        const selectedDate = new Date(e.target.value);
                        const dayOfWeek = selectedDate.getDay();
                        
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
                        
                        field.onChange(e.target.value);
                      }}
                    />
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
                    <Input 
                      type="time"
                      step="900"
                      {...field}
                      onChange={(e) => {
                        const selectedTime = e.target.value;
                        const selectedDate = form.getValues("appointmentDate");
                        if (!selectedDate) {
                          toast({
                            title: "Error",
                            description: "Please select a date first",
                            variant: "destructive"
                          });
                          return;
                        }

                        const dateObj = new Date(selectedDate);
                        const dayOfWeek = dateObj.getDay();
                        
                        // Get working hours for the selected day
                        const daySchedule = workingHours?.find(
                          (schedule) => schedule.dayOfWeek === dayOfWeek
                        );
                        
                        const validation = validateTimeSlot(selectedDate, selectedTime, daySchedule);
                        if (!validation.isValid) {
                          toast({
                            title: "Invalid Time",
                            description: validation.error,
                            variant: "destructive"
                          });
                          return;
                        }
                        
                        // Check availability
                        const fullDateTime = new Date(selectedDate);
                        const [timeHours, timeMinutes] = selectedTime.split(':').map(Number);
                        fullDateTime.setHours(timeHours, timeMinutes, 0, 0);
                        
                        const selectedGroomerId = form.getValues("groomerId");
                        if (selectedGroomerId && !isTimeSlotAvailable(fullDateTime, selectedGroomerId)) {
                          toast({
                            title: "Time Slot Unavailable",
                            description: "This time slot is already booked. Please select another time.",
                            variant: "destructive"
                          });
                          return;
                        }
                        
                        field.onChange(selectedTime);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
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
