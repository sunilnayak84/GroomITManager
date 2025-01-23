import React, { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { uploadFile } from "@/lib/storage";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { z } from "zod";
import type { AppointmentWithRelations } from "@/lib/schema";
import { useAppointments } from "@/hooks/use-appointments";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface AppointmentDetailsProps {
  appointment: AppointmentWithRelations;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
}

const updateAppointmentSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'completed', 'cancelled', 'in_progress']), // Added 'in_progress'
  cancellationReason: z.enum(['no_show', 'rescheduled', 'other']).optional(),
  notes: z.string().optional(),
  beforeImage: z.string().optional(), // Added beforeImage
});

type UpdateAppointmentForm = z.infer<typeof updateAppointmentSchema>;

const AppointmentDetails = ({
  appointment,
  open,
  onOpenChange,
  onEdit,
}: AppointmentDetailsProps): React.ReactElement => {
  const { updateAppointment } = useAppointments();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<UpdateAppointmentForm>({
    resolver: zodResolver(updateAppointmentSchema),
    defaultValues: {
      status: appointment.status,
      cancellationReason: appointment.cancellationReason || undefined,
      notes: appointment.notes || undefined,
      beforeImage: appointment.beforeImage || undefined, //Added default value for beforeImage
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        status: appointment.status,
        cancellationReason: appointment.cancellationReason || undefined,
        notes: appointment.notes || undefined,
        beforeImage: appointment.beforeImage || undefined, //Added reset for beforeImage
      });
    }
  }, [open, appointment.id]);

  const handleImageUpload = async (file: File) => {
    const path = `appointments/${appointment.id}/before-image-${Date.now()}`;
    return await uploadFile(file, path);
  };

  const onSubmit = async (data: UpdateAppointmentForm) => {
    try {
      setIsUpdating(true);
      
      // Handle beforeImage based on status
      if (data.status === 'in_progress') {
        // Check if we already have a beforeImage
        if (!appointment.beforeImage) {
          const fileInput = document.createElement('input');
          fileInput.type = 'file';
          fileInput.accept = 'image/*';

          const file = await new Promise<File | null>((resolve) => {
            fileInput.onchange = (e) => {
              const files = (e.target as HTMLInputElement).files;
              resolve(files ? files[0] : null);
            };
            fileInput.click();
          });

          if (!file) {
            toast({
              variant: "destructive",
              title: "Error",
              description: "Please upload a before image to start grooming",
            });
            setIsUpdating(false);
            return;
          }

          const imageUrl = await handleImageUpload(file);
          data.beforeImage = imageUrl;
          form.setValue('beforeImage', imageUrl);
        } else {
          data.beforeImage = appointment.beforeImage;
        }
      } else if (appointment.beforeImage) {
        // Keep existing beforeImage if it exists
        data.beforeImage = appointment.beforeImage;
      } else {
        // Don't include beforeImage for other statuses if it doesn't exist
        delete data.beforeImage;
      }
      const previousData = queryClient.getQueryData<AppointmentWithRelations[]>(["appointments"]);

      if (previousData) {
        queryClient.setQueryData<AppointmentWithRelations[]>(
          ["appointments"],
          previousData.map((apt) =>
            apt.id === appointment.id
              ? { ...apt, status: data.status, notes: data.notes || null, beforeImage: data.beforeImage || null }
              : apt
          )
        );
      }

      await updateAppointment({
        id: appointment.id,
        status: data.status,
        cancellationReason: data.status === 'cancelled' ? data.cancellationReason || undefined : undefined,
        notes: data.notes,
        beforeImage: data.beforeImage // Added beforeImage to updateAppointment call
      });

      toast({
        title: "Success",
        description: "Appointment status updated successfully",
      });

      onOpenChange(false);
    } catch (error) {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });

      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error 
          ? `Failed to update appointment: ${error.message}` 
          : "Failed to update appointment status",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Appointment Details</DialogTitle>
          <DialogDescription>
            View and manage appointment information
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Date & Time</h3>
              <p className="mt-1 text-sm">
                {format(new Date(appointment.date), "PPP p")}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500">Pet</h3>
              <div className="mt-1 flex items-center gap-2">
                <img
                  src={appointment.pet.image || `https://api.dicebear.com/7.x/adventurer/svg?seed=${appointment.pet.name}`}
                  alt={appointment.pet.name}
                  className="h-10 w-10 rounded-full"
                />
                <div>
                  <p className="text-sm font-medium">{appointment.pet.name}</p>
                  <p className="text-sm text-gray-500">{appointment.pet.breed}</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500">Customer</h3>
              <p className="mt-1 text-sm">
                {appointment.customer.firstName} {appointment.customer.lastName}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500">Groomer</h3>
              <p className="mt-1 text-sm">{appointment.groomer.name}</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500">Services</h3>
              <div className="mt-1 space-y-2">
                {appointment.services.map((serviceId, index) => (
                  <div key={serviceId} className="border-b pb-2 last:border-b-0">
                    <p className="text-sm font-medium">
                      {appointment.service?.[index]?.name || 'Unknown Service'}
                    </p>
                    {appointment.service?.[index]?.price && (
                      <p className="text-sm text-gray-500">
                        Price: ₹{appointment.service[index].price}
                      </p>
                    )}
                    {appointment.service?.[index]?.duration && (
                      <p className="text-sm text-gray-500">
                        Duration: {appointment.service[index].duration} minutes
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.watch("status") === "cancelled" && (
              <FormField
                control={form.control}
                name="cancellationReason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cancellation Reason</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select reason for cancellation" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="no_show">No Show</SelectItem>
                        <SelectItem value="rescheduled">Rescheduled</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
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
                    <Input {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="mt-4 border-t pt-4">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Before Image</h3>
              {appointment.beforeImage ? (
                <img
                  src={appointment.beforeImage}
                  alt="Before grooming"
                  className="h-20 w-20 object-cover rounded-md cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => window.open(appointment.beforeImage, '_blank')}
                />
              ) : (
                <p className="text-sm text-gray-500">No image uploaded</p>
              )}
            </div>

            <div className="flex justify-end space-x-2 mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isUpdating}
                className="min-w-[140px]"
              >
                {isUpdating ? (
                  <>
                    <span className="mr-2">Updating...</span>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  </>
                ) : (
                  "Update Appointment"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AppointmentDetails;