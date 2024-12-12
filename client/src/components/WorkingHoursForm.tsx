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
  branchId: string;
  onSuccess?: () => void;
}

export default function WorkingHoursForm({ branchId, onSuccess }: WorkingHoursFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<InsertWorkingDays>({
    resolver: zodResolver(insertWorkingDaysSchema),
    defaultValues: {
      branchId: parseInt(branchId),
      dayOfWeek: 1,
      isOpen: true,
      openingTime: "09:00",
      closingTime: "17:00",
      breakStart: "13:00",
      breakEnd: "14:00",
      maxDailyAppointments: 8
    },
  });

  async function onSubmit(data: InsertWorkingDays) {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      // TODO: Add API call to save working hours
      console.log('Submitting working hours:', data);
      
      toast({
        title: "Success",
        description: "Working hours updated successfully",
      });
      
      onSuccess?.();
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
          {isSubmitting ? "Updating..." : "Update Working Hours"}
        </Button>
      </form>
    </Form>
  );
}
