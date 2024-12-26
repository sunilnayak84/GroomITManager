import { useState, useEffect, useMemo } from "react";
import { auth } from "../lib/firebase";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
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
import type { Staff } from '@/lib/staff-types';

interface AppointmentFormProps {
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  open?: boolean;
  initialDate?: string;
  initialTime?: string;
}

export default function AppointmentForm({ setOpen, initialDate, initialTime }: AppointmentFormProps) {
  const queryClient = useQueryClient();
  const { user } = useUser();
  const { createNotification } = useNotifications(user?.id || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const { data: appointments, addAppointment, isTimeSlotAvailable } = useAppointments();
  const { pets } = usePets();
  const { services } = useServices();
  const { toast } = useToast();
  const isCustomer = user?.role === 'customer';
  const { staffMembers, isLoading: isStaffLoading } = useStaff();
  
  const availableGroomers = useMemo(() => {
    return (staffMembers || []).filter((staff: Staff) => 
      staff.isActive && (
        staff.role === 'groomer' || 
        staff.role === 'staff' ||
        staff.isGroomer === true || 
        (Array.isArray(staff.specialties) && staff.specialties.includes('groomer'))
      )
    );
  }, [staffMembers]);
  const { data: workingHours } = useWorkingHours();
  const [selectedService, setSelectedService] = useState<{ duration: number } | null>(null);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);

  const form = useForm<z.infer<typeof insertAppointmentSchema>>({
    resolver: zodResolver(insertAppointmentSchema),
    defaultValues: {
      petId: "",
      services: [] as string[],
      groomerId: "",
      branchId: "1",
      date: initialDate || format(new Date(), 'yyyy-MM-dd'),
      time: initialTime || format(new Date(), 'HH:mm'),
      status: "pending" as const,
      notes: "",
      productsUsed: null,
      totalPrice: 0,
      totalDuration: 0
    }
  });

  useEffect(() => {
    if (initialDate && initialTime) {
      const selectedDate = new Date(initialDate);
      const dayOfWeek = selectedDate.getDay();
      const daySchedule = workingHours?.find(schedule => schedule.dayOfWeek === dayOfWeek);
      
      if (daySchedule?.isOpen) {
        const slots = generateTimeSlots(
          daySchedule.openingTime,
          daySchedule.closingTime,
          daySchedule.breakStart || null,
          daySchedule.breakEnd || null
        );
        setAvailableTimeSlots(slots);
      }

      form.reset({
        ...form.getValues(),
        date: initialDate,
        time: initialTime
      });
    }
  }, [initialDate, initialTime, workingHours]);

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

      // Get all appointments for the selected time slot
      const conflictingAppointments = appointments?.filter(a => {
        const existingStart = new Date(a.date);
        const existingEnd = new Date(existingStart);
        existingEnd.setMinutes(existingEnd.getMinutes() + (a.totalDuration || 30));

        return (
          // New appointment starts during existing appointment
          (appointmentStartTime >= existingStart && appointmentStartTime < existingEnd) ||
          // New appointment ends during existing appointment
          (appointmentEndTime > existingStart && appointmentEndTime <= existingEnd)
        );
      }) || [];

      // Check if all groomers are busy
      const availableGroomers = availableGroomers?.filter(groomer => 
        !conflictingAppointments.some(appt => appt.groomerId === groomer.id)
      );

      if (availableGroomers.length === 0) {
        return {
          isValid: false,
          error: 'All groomers are busy during this time slot'
        };
      }

      // If a specific groomer is selected, check their availability
      if (groomerId) {
        const groomerConflict = conflictingAppointments.find(a => a.groomerId === groomerId);
        if (groomerConflict) {
          return {
            isValid: false,
            error: `Selected groomer has a conflicting appointment from ${format(new Date(groomerConflict.date), 'h:mm a')} to ${format((() => {
              const end = new Date(groomerConflict.date);
              end.setMinutes(end.getMinutes() + (groomerConflict.totalDuration || 60));
              return end;
            })(), 'h:mm a')}`
          };
        }
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

      const appointmentDateTime = new Date(data.date + 'T' + data.time);
      if (!isTimeSlotAvailable(appointmentDateTime, null, data.totalDuration || 30)) {
        const errorMsg = "This time slot is already booked. Please select a different time.";
        setValidationError(errorMsg);
        toast({
          variant: "destructive",
          title: "Booking Error",
          description: errorMsg,
          duration: 3000,
        });
        return;
      }

      // For staff members, groomer selection is required
      if (user?.role !== 'customer' && !data.groomerId) {
        throw new Error("Please select a groomer");
      }

      // For customers, auto-assign groomer
      if (user?.role === 'customer') {
        try {
          const groomersResponse = await fetch('/api/groomers', {
            headers: {
              'Authorization': `Bearer ${await auth.currentUser?.getIdToken()}`
            }
          });
          const groomersData = await groomersResponse.json();
          
          if (groomersData.autoAssignedGroomer) {
            data.groomerId = groomersData.autoAssignedGroomer.id;
            if (!data.groomerId) {
              throw new Error('No groomer ID received from auto-assignment');
            }
            // Add groomer info to appointment data
            const appointmentData = {
              ...data,
              groomer: {
                id: groomersData.autoAssignedGroomer.id,
                name: groomersData.autoAssignedGroomer.name
              }
            };
            await addAppointment(appointmentData);
            return;
          } else {
            throw new Error('No groomer available for auto-assignment');
          }
        } catch (error) {
          console.error('Error auto-assigning groomer:', error);
          data.groomerId = null;
        }
      }

      const formDate = form.getValues('date');
      const formTime = form.getValues('time');
      
      if (!formDate || !formTime) {
        throw new Error("Please select both date and time");
      }

      const [timeHours, timeMinutes] = formTime.split(':').map(Number);
      appointmentDateTime.setHours(timeHours, timeMinutes, 0, 0);
      // Convert to UTC for storage while preserving the intended local time
      const offset = appointmentDateTime.getTimezoneOffset() * 60000;
      const adjustedDate = new Date(appointmentDateTime.getTime() - offset);
      
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
      // Validation is now handled by backend

      if (!validation.isValid) {
        const errorMessage = validation.error || "This time slot conflicts with an existing appointment";
        
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

      // Add debug logs
      console.log('Form date:', formDate);
      console.log('Form time:', formTime);
      console.log('Raw date/time:', appointmentDateTime);
      console.log('ISO date/time:', appointmentDateTime.toISOString());

      const appointmentData: InsertAppointment = {
        ...data,
        date: adjustedDate.toISOString(),
        status: "pending" as const,
      };
      
      console.log('Final appointment data:', appointmentData);

      try {
        await addAppointment(appointmentData);
        
        // Reset form and states
        form.reset();
        setIsSubmitting(false);
        setValidationError(null);
        setSelectedService(null);
        setAvailableTimeSlots([]);
        
        // Close dialog first
        setOpen(false);
        
        // Show success message and refresh data after dialog closes
        setTimeout(() => {
          toast({
            title: "Success",
            description: "Appointment scheduled successfully",
            duration: 3000,
          });
          queryClient.invalidateQueries({ queryKey: ["appointments"] });
        }, 300);

      } catch (error) {
        console.error('Failed to schedule appointment:', error);
        const errorMessage = error instanceof Error ? error.message : "Failed to schedule appointment";
        setValidationError(errorMessage);
        toast({
          variant: "destructive",
          title: "Scheduling Error",
          description: errorMessage || "Failed to schedule appointment",
          duration: 3000,
        });
        setIsSubmitting(false);
        return; // Exit early on error
      }

      // Only runs on success
      setIsSubmitting(false);
      setOpen(false);
      
      // Show success toast after dialog closes
      setTimeout(() => {
        toast({
          title: "Success",
          description: "Appointment scheduled successfully",
          duration: 3000,
        });
      }, 300);

      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    } catch (error: any) {
      console.error('Failed to schedule appointment:', error);
      const errorMessage = error?.message || error?.toString() || "Failed to schedule appointment";
      setValidationError(errorMessage);
      toast({
        variant: "destructive", 
        title: "Error",
        description: errorMessage,
        duration: 5000,
      });
      setIsSubmitting(false);
      return;
    }
  }

  useEffect(() => {
    if (!open) {
      form.reset();
      form.clearErrors();
      setValidationError(null);
      setSelectedService(null);
      setAvailableTimeSlots([]);
    }
  }, [open]);

  const closeDialog = () => {
    form.reset();
    setValidationError(null);
    setSelectedService(null);
    setAvailableTimeSlots([]);
    setIsSubmitting(false);
    setOpen(false);
  };

  return (
    <DialogContent className="sm:max-w-[600px]">
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
                    {Array.isArray(pets) ? pets.map((pet) => (
                      <SelectItem 
                        key={String(pet?.id || '')} 
                        value={String(pet?.id || '')}
                      >
                        {pet?.name || 'Unknown'} - {pet?.breed || 'Unknown'}
                      </SelectItem>
                    )) : null}
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
                        // Create date object and set it to start of day to avoid timezone issues
                        const selectedDate = new Date(e.target.value + 'T00:00:00');
                        const dayOfWeek = selectedDate.getDay();
                        
                        // Update form field with ISO date string
                        field.onChange(e.target.value);
                        
                        const daySchedule = workingHours?.find(
                          (schedule) => schedule.dayOfWeek === dayOfWeek
                        );
                        
                        if (!daySchedule || !daySchedule.isOpen) {
                          setAvailableTimeSlots([]);
                          form.setValue('time', '');
                          if (!daySchedule) {
                            toast({
                              title: "Invalid Day Selected",
                              description: "Working hours haven't been configured for this day. Please select another date.",
                              variant: "destructive"
                            });
                          } else {
                            toast({
                              title: "Business Closed",
                              description: `Sorry, we're closed on ${selectedDate.toLocaleDateString('en-US', { weekday: 'long' })}s. Please select another date.`,
                              variant: "destructive"
                            });
                          }
                          return;
                        }
                        
                        // Update form field with ISO date string if validation passes
                        field.onChange(e.target.value);
                        
                        // Generate time slots with default duration if no service selected
                        const duration = selectedService?.duration || 30;
                        const slots = generateTimeSlots(
                          daySchedule.openingTime,
                          daySchedule.closingTime,
                          daySchedule.breakStart || null,
                          daySchedule.breakEnd || null,
                          duration
                        );
                        
                        // Filter slots based on current time if it's today
                        const today = new Date();
                        const selectedDateObj = new Date(e.target.value);
                        
                        // Date is already formatted correctly from the input
                        field.onChange(e.target.value);
                        
                        if (selectedDateObj.toDateString() === today.toDateString()) {
                          const currentHour = today.getHours();
                          const currentMinute = today.getMinutes();
                          const filteredSlots = slots.filter(slot => {
                            const [slotHour, slotMinute] = slot.split(':').map(Number);
                            return (slotHour > currentHour) || 
                                   (slotHour === currentHour && slotMinute > currentMinute);
                          });
                          setAvailableTimeSlots(filteredSlots);
                        } else {
                          setAvailableTimeSlots(slots);
                        }
                        
                        // Set initial time slot if available
                        if (slots.length > 0) {
                          form.setValue('time', slots[0]);
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
                    <SelectContent className="max-h-[200px] overflow-y-auto">
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
                    {Array.isArray(services) && services.map((service) => 
                      service && (
                        <div key={service?.service_id || ''} className="flex items-center space-x-2">
                          <Checkbox
                            checked={Array.isArray(field.value) && field.value ? field.value.includes(String(service?.service_id)) : false}
                            onCheckedChange={(checked) => {
                              const serviceId = String(service?.service_id || '');
                              const currentValue = Array.isArray(field.value) ? field.value : [];
                              const updatedServices = checked
                                ? [...currentValue, serviceId]
                                : currentValue.filter((id) => id !== serviceId);
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

          {user?.role !== 'customer' && (
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
                      {availableGroomers.map((groomer: Staff) => (
                        <SelectItem 
                          key={groomer.id || ''} 
                          value={groomer.id || ''}
                        >
                          {groomer.name || 'Unknown Groomer'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

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
          <div className="flex gap-4">
            <Button 
              type="button"
              variant="outline"
              onClick={() => {
                form.reset();
                setValidationError(null);
                setSelectedService(null);
                setAvailableTimeSlots([]);
              }}
            >
              Clear Form
            </Button>
            <Button 
              type="submit" 
              className="flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Scheduling..." : "Schedule Appointment"}
            </Button>
          </div>
        </form>
      </Form>
    </DialogContent>
  );
}