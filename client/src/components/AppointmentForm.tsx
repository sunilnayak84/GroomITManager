import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertAppointmentSchema, type InsertAppointment } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from 'date-fns';
import { useNotifications } from '@/hooks/use-notifications';
import { useUser } from '@/hooks/use-user';

interface AppointmentFormProps {
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function AppointmentForm({ setOpen }: AppointmentFormProps) {
  const { user } = useUser();
  const { createNotification } = useNotifications(user?.id || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const { data: appointments, addAppointment, isTimeSlotAvailable } = useAppointments();
  const { pets } = usePets();
  const { services } = useServices();
  const { toast } = useToast();
  const { staffMembers } = useStaff();
  const availableGroomers = staffMembers.filter(user => user.isGroomer && user.isActive);
  const { data: workingHours } = useWorkingHours();
  const [selectedService, setSelectedService] = useState<{ duration: number } | null>(null);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);

  const form = useForm<z.infer<typeof insertAppointmentSchema>>({
    resolver: zodResolver(insertAppointmentSchema),
    defaultValues: {
      petId: "",
      services: [],
      groomerId: "",
      branchId: "1",
      date: "",
      status: "pending" as const,
      notes: null,
      productsUsed: null,
      time: "",
      totalPrice: 0,
      totalDuration: 0
    },
  });

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
    
    let currentMinutes = openMinute;
    let currentHour = openHour;
    
    currentMinutes = Math.ceil(currentMinutes / 15) * 15;
    if (currentMinutes >= 60) {
      currentHour += Math.floor(currentMinutes / 60);
      currentMinutes = currentMinutes % 60;
    }
    
    const breakStartMinutes = breakStart ? 
      (parseInt(breakStart.split(':')[0]) * 60 + parseInt(breakStart.split(':')[1])) : null;
    const breakEndMinutes = breakEnd ?
      (parseInt(breakEnd.split(':')[0]) * 60 + parseInt(breakEnd.split(':')[1])) : null;
    
    while (currentHour < closeHour || (currentHour === closeHour && currentMinutes < closeMinute)) {
      const currentTimeMinutes = currentHour * 60 + currentMinutes;
      const slotEndMinutes = currentTimeMinutes + serviceDuration;
      
      if (slotEndMinutes <= (closeHour * 60 + closeMinute)) {
        const isInBreakTime = breakStartMinutes !== null && breakEndMinutes !== null &&
          currentTimeMinutes >= breakStartMinutes && currentTimeMinutes < breakEndMinutes;
        
        if (!isInBreakTime) {
          const timeString = `${String(currentHour).padStart(2, '0')}:${String(currentMinutes).padStart(2, '0')}`;
          slots.push(timeString);
        }
      }
      
      currentMinutes += 15;
      if (currentMinutes >= 60) {
        currentHour += Math.floor(currentMinutes / 60);
        currentMinutes = currentMinutes % 60;
      }
    }
    
    return slots;
  };

  useEffect(() => {
    const selectedServices = form.watch("services");
    if (selectedServices && selectedServices.length > 0) {
      const lastServiceId = selectedServices[selectedServices.length - 1];
      const service = services?.find(s => s.service_id === lastServiceId);
      setSelectedService(service || null);
    } else {
      setSelectedService(null);
    }
  }, [form.watch("services"), services]);

  const validateTimeSlot = (
    date: string,
    time: string,
    daySchedule: WorkingDays | undefined,
    groomerId: string
  ): { isValid: boolean; error?: string } => {
    setValidationError(null); // Clear previous errors

    if (!daySchedule || !daySchedule.isOpen) {
      return { isValid: false, error: "This day is not available for appointments" };
    }

    const [hours, minutes] = time.split(':').map(Number);
    const appointmentStartTime = new Date(date);
    appointmentStartTime.setHours(hours, minutes, 0, 0);

    // Calculate end time based on selected service duration
    const appointmentEndTime = new Date(appointmentStartTime);
    appointmentEndTime.setMinutes(appointmentEndTime.getMinutes() + (selectedService?.duration || 60));

    if (appointmentStartTime < new Date()) {
      return { isValid: false, error: "Cannot schedule appointments in the past" };
    }

    // Convert opening and closing times to Date objects for comparison
    const openingTime = new Date(date);
    const [openHours, openMinutes] = daySchedule.openingTime.split(':').map(Number);
    openingTime.setHours(openHours, openMinutes, 0, 0);

    const closingTime = new Date(date);
    const [closeHours, closeMinutes] = daySchedule.closingTime.split(':').map(Number);
    closingTime.setHours(closeHours, closeMinutes, 0, 0);

    if (appointmentStartTime < openingTime || appointmentEndTime > closingTime) {
      return {
        isValid: false,
        error: `Please select a time between ${daySchedule.openingTime} and ${daySchedule.closingTime}`
      };
    }

    if (selectedService) {
      const appointmentEndTime = new Date(appointmentStartTime);
      appointmentEndTime.setMinutes(appointmentEndTime.getMinutes() + selectedService.duration);
      const endTimeStr = `${String(appointmentEndTime.getHours()).padStart(2, '0')}:${String(appointmentEndTime.getMinutes()).padStart(2, '0')}`;
        
      if (endTimeStr > daySchedule.closingTime) {
        return {
          isValid: false,
          error: "The appointment duration exceeds closing time"
        };
      }

      if (daySchedule.breakStart && daySchedule.breakEnd) {
        const breakStart = new Date(date);
        const [breakStartHour, breakStartMin] = daySchedule.breakStart.split(':').map(Number);
        breakStart.setHours(breakStartHour, breakStartMin, 0, 0);

        const breakEnd = new Date(date);
        const [breakEndHour, breakEndMin] = daySchedule.breakEnd.split(':').map(Number);
        breakEnd.setHours(breakEndHour, breakEndMin, 0, 0);

        if (
          (appointmentStartTime < breakEnd && appointmentEndTime > breakStart) ||
          (appointmentStartTime >= breakStart && appointmentStartTime < breakEnd)
        ) {
          const breakStartTime = daySchedule.breakStart.split(':')
            .map(n => parseInt(n))
            .reduce((acc, n, i) => i === 0 ? n : acc + (n/60), 0);
          const breakEndTime = daySchedule.breakEnd.split(':')
            .map(n => parseInt(n))
            .reduce((acc, n, i) => i === 0 ? n : acc + (n/60), 0);
            
          const breakDuration = breakEndTime - breakStartTime;
          const breakEndHour = Math.floor(breakEndTime);
          const breakEndMinute = Math.round((breakEndTime - breakEndHour) * 60);
            
          return {
            isValid: false,
            error: `This time conflicts with our ${breakDuration === 1 ? '1 hour' : `${breakDuration} hours`} break period (until ${breakEndHour}:${String(breakEndMinute).padStart(2, '0')})`
          };
        }
      }

      // Check for overlapping appointments
      if (!isTimeSlotAvailable(appointmentStartTime, groomerId, selectedService.duration)) {
        // Find the conflicting appointment for a more specific error message
        const conflictingAppointment = appointments?.find(a => {
          if (a.groomerId !== groomerId) return false;
          const existingStart = new Date(a.date);
          const existingEnd = new Date(existingStart);
          const existingDuration = a.service?.duration || 60;
          existingEnd.setMinutes(existingEnd.getMinutes() + existingDuration);
            
          return (
            // New appointment starts during existing appointment
            (appointmentStartTime >= existingStart && appointmentStartTime < existingEnd) ||
            // New appointment ends during existing appointment
            (appointmentEndTime > existingStart && appointmentEndTime <= existingEnd) ||
            // New appointment completely contains existing appointment
            (appointmentStartTime <= existingStart && appointmentEndTime >= existingEnd) ||
            // Existing appointment completely contains new appointment
            (existingStart <= appointmentStartTime && existingEnd >= appointmentEndTime)
          );
        });
          
        return {
          isValid: false,
          error: conflictingAppointment 
            ? `This time slot conflicts with an existing appointment from ${format(new Date(conflictingAppointment.date), 'h:mm a')} to ${format((() => {
                const end = new Date(conflictingAppointment.date);
                end.setMinutes(end.getMinutes() + (conflictingAppointment.service?.duration || 60));
                return end;
              })(), 'h:mm a')}`
            : "The selected groomer is not available during this time. Please choose another time slot."
        };
      }
    }

    return { isValid: true };
  };

  async function onSubmit(data: z.infer<typeof insertAppointmentSchema>) {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    setValidationError(null);
    
    try {
      if (!data.petId || !data.services || data.services.length === 0) {
        throw new Error("Please select both pet and at least one service");
      }

      if (!data.groomerId) {
        throw new Error("Please select a groomer");
      }

      const formDate = form.getValues('date');
      const formTime = form.getValues('time');
      
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

      const validation = validateTimeSlot(formDate, formTime, daySchedule, data.groomerId);
      if (!validation.isValid) {
        const errorMessage = validation.error || "This time slot is not available";
        
        setValidationError(errorMessage);
        
        form.setError('time', {
          type: 'manual',
          message: errorMessage
        });
        
        form.setError('groomerId', {
          type: 'manual',
          message: "Groomer is not available at this time"
        });
        
        toast({
          variant: "destructive",
          title: "Scheduling Error",
          description: errorMessage,
          duration: 5000,
        });
        
        setIsSubmitting(false);
        return;
      }

      const appointmentData: InsertAppointment = {
        ...data,
        date: appointmentDateTime.toISOString(),
        status: "pending" as const,
      };

      const appointmentId = await addAppointment(appointmentData);
      
      // Create reminder notifications
      const appointmentTime = new Date(appointmentData.date);
      const formattedTime = format(appointmentTime, 'PPp');
      
      // Create notification for the customer
      if (user?.id) {
        try {
          await createNotification({
            userId: user.id,
            appointmentId,
            type: 'reminder',
            title: 'Upcoming Appointment Reminder',
            message: `You have a grooming appointment scheduled for ${formattedTime}. Please arrive 10 minutes before your scheduled time.`
          });
        } catch (error) {
          console.error('Error creating customer notification:', error);
        }
      }
      
      // Create notification for the groomer
      if (data.groomerId) {
        try {
          await createNotification({
            userId: data.groomerId,
            appointmentId,
            type: 'reminder',
            title: 'New Appointment Scheduled',
            message: `You have a new grooming appointment scheduled for ${formattedTime}.`
          });
        } catch (error) {
          console.error('Error creating groomer notification:', error);
        }
      }

      setOpen(false);
      
      toast({
        title: "Success",
        description: "Appointment scheduled successfully",
      });
      
      form.reset();
    } catch (error) {
      console.error('Failed to schedule appointment:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to schedule appointment";
      setValidationError(errorMessage);
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
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
      {validationError && (
        <Alert variant="destructive">
          <AlertDescription>{validationError}</AlertDescription>
        </Alert>
      )}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="petId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pet</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                      {...field}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => {
                        field.onChange(e.target.value);
                        const selectedDate = new Date(e.target.value);
                        const dayOfWeek = selectedDate.getDay();
                        
                        const daySchedule = workingHours?.find(
                          (schedule) => schedule.dayOfWeek === dayOfWeek
                        );
                        
                        if (!daySchedule) {
                          toast({
                            title: "Invalid Day Selected",
                            description: "Working hours haven't been configured for this day. Please select another date.",
                            variant: "destructive"
                          });
                          setAvailableTimeSlots([]);
                          field.onChange('');
                          form.setValue('time', '');
                          return;
                        }
                        
                        if (!daySchedule.isOpen) {
                          toast({
                            title: "Business Closed",
                            description: `Sorry, we're closed on ${selectedDate.toLocaleDateString('en-US', { weekday: 'long' })}s. Please select another date.`,
                            variant: "destructive"
                          });
                          setAvailableTimeSlots([]);
                          field.onChange('');
                          form.setValue('time', '');
                          return;
                        }
                        
                        const slots = generateTimeSlots(
                          daySchedule.openingTime,
                          daySchedule.closingTime,
                          daySchedule.breakStart || null,
                          daySchedule.breakEnd || null,
                          selectedService?.duration || 30
                        );
                        
                        setAvailableTimeSlots(slots);
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
                      {availableTimeSlots.map((timeSlot) => (
                        <SelectItem key={timeSlot} value={timeSlot}>
                          {timeSlot}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-4">
            <FormField
              control={form.control}
              name="services"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Services</FormLabel>
                  <div className="space-y-2">
                    {(services || []).map((service) => (
                      <div key={service.service_id} className="flex items-center space-x-2">
                        <Checkbox
                          checked={field.value.includes(String(service.service_id))}
                          onCheckedChange={(checked) => {
                            const serviceId = String(service.service_id);
                            const updatedServices = checked
                              ? [...field.value, serviceId]
                              : field.value.filter((id) => id !== serviceId);
                            field.onChange(updatedServices);
                            
                            // Calculate total duration and price
                            const selectedServices = services.filter((s) => 
                              updatedServices.includes(String(s.service_id))
                            );
                            const totalDuration = selectedServices.reduce(
                              (sum, s) => sum + (s.duration || 0), 
                              0
                            );
                            const totalPrice = selectedServices.reduce(
                              (sum, s) => sum + (s.price || 0), 
                              0
                            );
                            
                            form.setValue('totalDuration', totalDuration);
                            form.setValue('totalPrice', totalPrice);
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
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <div className="font-medium">Selected Services Summary</div>
                      <div className="text-sm text-gray-500">
                        Total Duration: {form.watch('totalDuration')} minutes
                      </div>
                      <div className="text-sm text-gray-500">
                        Total Price: ₹{form.watch('totalPrice')}
                      </div>
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

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
                  <Input {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {/* Customer ID is now handled in form's defaultValues */}
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