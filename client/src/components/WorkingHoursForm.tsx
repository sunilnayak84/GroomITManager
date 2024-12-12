import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertWorkingDaysSchema, type InsertWorkingDays } from "@/lib/schema";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useWorkingHours } from "@/hooks/use-working-hours";

const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

interface WorkingHoursFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDay?: number | null;
  existingSchedule?: WorkingDays;
}

export default function WorkingHoursForm({ 
  open, 
  onOpenChange, 
  defaultDay, 
  existingSchedule 
}: WorkingHoursFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addWorkingHours } = useWorkingHours();

  const form = useForm<InsertWorkingDays>({
    resolver: zodResolver(insertWorkingDaysSchema),
    defaultValues: existingSchedule ? {
      branchId: existingSchedule.branchId,
      dayOfWeek: existingSchedule.dayOfWeek,
      isOpen: existingSchedule.isOpen,
      openingTime: existingSchedule.openingTime,
      closingTime: existingSchedule.closingTime,
      breakStart: existingSchedule.breakStart || undefined,
      breakEnd: existingSchedule.breakEnd || undefined,
      maxDailyAppointments: existingSchedule.maxDailyAppointments
    } : {
      branchId: 1,
      dayOfWeek: defaultDay || 1,
      isOpen: true,
      openingTime: "09:00",
      closingTime: "17:00",
      breakStart: "13:00",
      breakEnd: "14:00",
      maxDailyAppointments: 8
    },
  });

  // Reset form when existingSchedule changes
  useEffect(() => {
    if (existingSchedule) {
      form.reset({
        branchId: existingSchedule.branchId,
        dayOfWeek: existingSchedule.dayOfWeek,
        isOpen: existingSchedule.isOpen,
        openingTime: existingSchedule.openingTime,
        closingTime: existingSchedule.closingTime,
        breakStart: existingSchedule.breakStart || undefined,
        breakEnd: existingSchedule.breakEnd || undefined,
        maxDailyAppointments: existingSchedule.maxDailyAppointments
      });
    } else if (defaultDay !== undefined && defaultDay !== null) {
      form.reset({
        ...form.getValues(),
        dayOfWeek: defaultDay
      });
    }
  }, [existingSchedule, defaultDay, form]);

  async function onSubmit(data: InsertWorkingDays) {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await addWorkingHours(data);
      
      toast({
        title: "Success",
        description: "Working hours updated successfully",
      });
      
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error('Failed to update working hours:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update working hours",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Working Hours</DialogTitle>
          <DialogDescription>
            Set the working hours for a specific day of the week.
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
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
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
              name="isOpen"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormLabel>Is Open</FormLabel>
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
              name="openingTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Opening Time</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="closingTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Closing Time</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
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
                    <Input type="time" {...field} value={field.value || ''} />
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
                    <Input type="time" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="maxDailyAppointments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Daily Appointments</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min={1}
                      max={50}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
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
              {isSubmitting ? "Adding..." : "Add Working Hours"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
