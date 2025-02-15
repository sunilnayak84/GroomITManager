
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { staffAvailabilitySchema, type InsertStaffAvailability } from "@/lib/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStaffAvailability } from "@/hooks/use-staff-availability";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Switch } from "./ui/switch";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const DAYS_OF_WEEK = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
];

interface StaffAvailabilityFormProps {
  staffId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDay?: number;
  existingSchedule?: InsertStaffAvailability;
}

export default function StaffAvailabilityForm({
  staffId,
  open,
  onOpenChange,
  defaultDay = 0,
  existingSchedule
}: StaffAvailabilityFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addAvailability, isAdding } = useStaffAvailability(staffId);

  const { availability } = useStaffAvailability(staffId);
  const existingAvailability = availability?.find(a => a.dayOfWeek === Number(defaultDay));
  
  const form = useForm<InsertStaffAvailability>({
    resolver: zodResolver(staffAvailabilitySchema),
    defaultValues: {
      staffId,
      dayOfWeek: Number(defaultDay),
      isAvailable: existingAvailability?.isAvailable ?? true,
      startTime: existingAvailability?.startTime ?? "09:00",
      endTime: existingAvailability?.endTime ?? "17:00",
      breakStart: existingAvailability?.breakStart ?? null,
      breakEnd: existingAvailability?.breakEnd ?? null,
    }
  });

  // Update form values when availability data changes or day changes
  useEffect(() => {
    const dayAvailability = availability?.find(a => a.dayOfWeek === Number(defaultDay));
    form.reset({
      staffId,
      dayOfWeek: Number(defaultDay),
      isAvailable: dayAvailability?.isAvailable ?? true,
      startTime: dayAvailability?.startTime ?? "09:00",
      endTime: dayAvailability?.endTime ?? "17:00",
      breakStart: dayAvailability?.breakStart ?? null,
      breakEnd: dayAvailability?.breakEnd ?? null,
    });
  }, [availability, staffId, defaultDay, form]);

  async function onSubmit(data: InsertStaffAvailability) {
    console.log('[STAFF_AVAIL_FORM] Submit Start:', { 
      isSubmitting, 
      isAdding, 
      formData: JSON.stringify(data, null, 2)
    });

    if (typeof data.dayOfWeek !== 'number' || data.dayOfWeek < 0 || data.dayOfWeek > 6) {
      console.error('[Form Submit] Invalid day of week:', data.dayOfWeek);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a valid day of the week",
      });
      return;
    }
    
    if (isSubmitting || isAdding) {
      console.log('[Form Submit] Blocked due to submission in progress');
      return;
    }
    
    setIsSubmitting(true);
    try {
      console.log('Form data:', data);
      if (data.isAvailable && (!data.startTime || !data.endTime)) {
        throw new Error("Start time and end time are required when staff is available");
      }

      console.log('[STAFF_AVAIL] Current form data:', data);
      const availability = {
        staffId,
        dayOfWeek: Number(data.dayOfWeek),
        startTime: data.startTime,
        endTime: data.endTime,
        breakStart: data.breakStart || null,
        breakEnd: data.breakEnd || null,
        isAvailable: data.isAvailable ?? true
      };
      console.log('Submitting availability:', availability);
      const result = await addAvailability(availability);
      console.log('Submission result:', result);
      
      toast({
        title: "Success",
        description: "Staff availability updated successfully",
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving availability:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update staff availability",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set Staff Availability</DialogTitle>
          <DialogDescription>
            Configure availability for {DAYS_OF_WEEK[form.watch("dayOfWeek")]}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="dayOfWeek"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Day of Week</FormLabel>
                  <FormControl>
                    <Select
                      value={String(field.value)}
                      onValueChange={(value) => {
                        const numValue = Number(value);
                        if (!isNaN(numValue)) {
                          field.onChange(numValue);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a day" />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS_OF_WEEK.map((day, index) => (
                          <SelectItem key={index} value={String(index)}>
                            {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isAvailable"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormLabel>Is Available</FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="startTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Time</FormLabel>
                  <FormControl>
                    <Input
                      type="time"
                      {...field}
                      disabled={!form.watch("isAvailable")}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="endTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Time</FormLabel>
                  <FormControl>
                    <Input
                      type="time"
                      {...field}
                      disabled={!form.watch("isAvailable")}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="breakStart"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Break Start (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="time"
                      {...field}
                      value={field.value || ""}
                      disabled={!form.watch("isAvailable")}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="breakEnd"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Break End (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="time"
                      {...field}
                      value={field.value || ""}
                      disabled={!form.watch("isAvailable")}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSubmitting || isAdding}
            >
              {isSubmitting || isAdding ? "Saving..." : "Save Availability"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
