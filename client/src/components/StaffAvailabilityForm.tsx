
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { staffAvailabilitySchema, type InsertStaffAvailability } from "@/lib/schema";
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

  const form = useForm<InsertStaffAvailability>({
    resolver: zodResolver(staffAvailabilitySchema),
    defaultValues: {
      staffId,
      dayOfWeek: Number(defaultDay),
      isAvailable: true,
      startTime: "09:00",
      endTime: "17:00",
      breakStart: null,
      breakEnd: null,
      ...existingSchedule
    }
  });

  async function onSubmit(data: InsertStaffAvailability) {
    console.log('[STAFF_AVAIL_FORM] Submit Start:', { 
      isSubmitting, 
      isAdding, 
      formData: JSON.stringify(data, null, 2)
    });

    if (!data.dayOfWeek) {
      console.error('[Form Submit] Missing day of week');
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a day of the week",
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

      const availability = {
        ...data,
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
                    <select
                      className="w-full p-2 border rounded"
                      {...field}
                      value={field.value}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        if (!isNaN(value)) {
                          field.onChange(value);
                        }
                      }}
                    >
                      {DAYS_OF_WEEK.map((day, index) => (
                        <option key={index} value={index}>
                          {day}
                        </option>
                      ))}
                    </select>
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
