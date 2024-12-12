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
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);

  // Helper function to generate time slots
  const generateTimeSlots = (
    openingTime: string,
    closingTime: string,
    breakStart: string | null,
    breakEnd: string | null,
    serviceDuration: number = 30
  ) => {
    const slots: string[] = [];
    const [openHour, openMinute] = openingTime.split(':').map(Number);
    const [closeHour, closeMinute] = closingTime.split(':').map(Number);
    
    // Start from opening time, rounded to nearest 15 minutes
    let currentMinutes = openMinute;
    let currentHour = openHour;
    
    // Round up to next 15-minute interval
    currentMinutes = Math.ceil(currentMinutes / 15) * 15;
    if (currentMinutes >= 60) {
      currentHour += Math.floor(currentMinutes / 60);
      currentMinutes = currentMinutes % 60;
    }
    
    // Convert break times to comparable format (minutes since midnight)
    const breakStartMinutes = breakStart ? 
      (parseInt(breakStart.split(':')[0]) * 60 + parseInt(breakStart.split(':')[1])) : null;
    const breakEndMinutes = breakEnd ?
      (parseInt(breakEnd.split(':')[0]) * 60 + parseInt(breakEnd.split(':')[1])) : null;
    
    while (currentHour < closeHour || (currentHour === closeHour && currentMinutes < closeMinute)) {
      const currentTimeMinutes = currentHour * 60 + currentMinutes;
      const slotEndMinutes = currentTimeMinutes + serviceDuration;
      
      // Check if slot ends before closing time
      if (slotEndMinutes <= (closeHour * 60 + closeMinute)) {
        // Check if slot overlaps with break time
        const isInBreakTime = breakStartMinutes !== null && breakEndMinutes !== null &&
          currentTimeMinutes >= breakStartMinutes && currentTimeMinutes < breakEndMinutes;
        
        if (!isInBreakTime) {
          const timeString = `${String(currentHour).padStart(2, '0')}:${String(currentMinutes).padStart(2, '0')}`;
          slots.push(timeString);
        }
      }
      
      // Move to next 15-minute slot
      currentMinutes += 15;
      if (currentMinutes >= 60) {
        currentHour += Math.floor(currentMinutes / 60);
        currentMinutes = currentMinutes % 60;
      }
    }
    
    return slots;
  };
  
  const form = useForm<z.infer<typeof insertAppointmentSchema>>({
    resolver: zodResolver(insertAppointmentSchema),
    defaultValues: {
      petId: "",
      serviceId: "",
      groomerId: "",
      branchId: "1",
      date: "",
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

  async function onSubmit(data: z.infer<typeof insertAppointmentSchema>) {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      if (!data.petId || !data.serviceId) {
        throw new Error("Please select both pet and service");
      }

      if (!data.groomerId) {
        throw new Error("Please select a groomer");
      }

      const formDate = form.getValues('date');
      const formTime = form.getValues('appointmentTime');
      
      if (!formDate || !formTime) {
        throw new Error("Please select both date and time");
      }

      const appointmentDateTime = new Date(formDate);
      const [timeHours, timeMinutes] = formTime.split(':').map(Number);
      appointmentDateTime.setHours(timeHours, timeMinutes, 0, 0);
      
      if (isNaN(appointmentDateTime.getTime())) {
        throw new Error("Invalid appointment date and time");
      }

      const now = new Date();
      if (appointmentDateTime < now) {
        throw new Error("Appointment must be in the future");
      }

      // Validate against working hours
      const dayOfWeek = appointmentDateTime.getDay();
      const daySchedule = workingHours?.find(
        (schedule) => schedule.dayOfWeek === dayOfWeek
      );

      const validation = validateTimeSlot(formDate, formTime, daySchedule);
      if (!validation.isValid) {
        throw new Error(validation.error || "Invalid time slot");
      }

      const appointmentData: InsertAppointment = {
        ...data,
        date: appointmentDateTime.toISOString(),
        status: "pending" as const,
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
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input 
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      value={field.value || ''}
                      onChange={field.onChange}
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
                          setAvailableTimeSlots([]);
                          return;
                        }
                        
                        // Generate available time slots based on working hours and service duration
                        const slots = generateTimeSlots(
                          daySchedule.openingTime,
                          daySchedule.closingTime,
                          daySchedule.breakStart || null,
                          daySchedule.breakEnd || null,
                          selectedService?.duration || 30
                        );
                        
                        setAvailableTimeSlots(slots);
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
              name="time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Time</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a time" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableTimeSlots.map((timeSlot) => {
                        const [hours, minutes] = timeSlot.split(':').map(Number);
                        const time = new Date();
                        time.setHours(hours, minutes, 0, 0);
                        const formattedTime = time.toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        });
                        return (
                          <SelectItem key={timeSlot} value={timeSlot}>
                            {formattedTime}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
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
