import React, { useState, useEffect } from "react";
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
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { z } from "zod";
import type { AppointmentWithRelations } from "@/lib/schema";
import { useAppointments } from "@/hooks/use-appointments";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const updateAppointmentSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'completed', 'cancelled', 'in_progress']),
  cancellationReason: z.enum(['no_show', 'rescheduled', 'other']).optional(),
  notes: z.string().optional(),
});

type UpdateAppointmentForm = z.infer<typeof updateAppointmentSchema>;

interface AppointmentDetailsProps {
  appointment: AppointmentWithRelations;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
}

const AppointmentDetails = ({
  appointment,
  open,
  onOpenChange,
  onEdit,
}: AppointmentDetailsProps): React.ReactElement => {
  const { updateAppointment } = useAppointments();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);
  const queryClient = useQueryClient();

  // Add detailed debugging logs
  useEffect(() => {
    console.log('AppointmentDetails: Component mounted/updated', {
      id: appointment.id,
      beforeImage: appointment.beforeImage,
      status: appointment.status,
      timestamp: new Date().toISOString()
    });

    // Cleanup function to prevent stale renders
    return () => {
      console.log('AppointmentDetails: Component cleanup', {
        id: appointment.id,
        timestamp: new Date().toISOString()
      });
    };
  }, [appointment]);

  // Log when dialog opens/closes
  useEffect(() => {
    console.log('Dialog open state changed:', {
      open,
      appointmentId: appointment.id,
      beforeImage: appointment.beforeImage,
      timestamp: new Date().toISOString()
    });
  }, [open, appointment]);

  const form = useForm<UpdateAppointmentForm>({
    resolver: zodResolver(updateAppointmentSchema),
    defaultValues: {
      status: appointment.status,
      cancellationReason: appointment.cancellationReason || undefined,
      notes: appointment.notes || undefined,
    },
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      console.log('Resetting form with status:', appointment.status);
      form.reset({
        status: appointment.status,
        cancellationReason: appointment.cancellationReason || undefined,
        notes: appointment.notes || undefined,
      });
    }
  }, [open, appointment]); // Re-run when appointment changes too

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.error('Image load error:', {
      url: appointment.beforeImage,
      error: e,
      timestamp: new Date().toISOString()
    });
    setImageLoadError(true);
    setIsImageLoading(false);
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.log('Image loaded successfully:', {
      url: appointment.beforeImage,
      timestamp: new Date().toISOString()
    });
    setImageLoadError(false);
    setIsImageLoading(false);
  };

  const handleImageUpload = async (file: File) => {
    try {
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File size must be less than 5MB');
      }

      setIsUpdating(true);
      setIsImageLoading(true);
      const timestamp = Date.now();
      const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `appointments/${appointment.id}/before-image-${timestamp}.${extension}`;

      const { uploadFile } = await import("@/lib/storage");
      const url = await uploadFile(file, path);

      console.log('Image uploaded successfully:', url);

      await updateAppointment({
        id: appointment.id,
        status: form.getValues("status"),
        beforeImage: url,
      });

      // Invalidate queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ["appointments"] });

      toast({
        title: "Success",
        description: "Before image uploaded successfully",
      });
    } catch (error) {
      console.error('Image upload error:', error);
      setImageLoadError(true);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error
          ? `Failed to upload image: ${error.message}`
          : "Failed to upload image",
      });
    } finally {
      setIsUpdating(false);
      const input = document.getElementById('before-image-upload') as HTMLInputElement;
      if (input) input.value = '';
    }
  };

  const onSubmit = async (data: UpdateAppointmentForm) => {
    try {
      console.log('Submitting form with data:', data);
      setIsUpdating(true);
      await updateAppointment({
        id: appointment.id,
        status: data.status,
        cancellationReason: data.status === 'cancelled' ? data.cancellationReason : undefined,
        notes: data.notes,
      });

      await queryClient.invalidateQueries({ queryKey: ["appointments"] });

      toast({
        title: "Success",
        description: "Appointment status updated successfully",
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Form submission error:', error);
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

  const getStatusTransitions = (status: string): string[] => {
    switch (status) {
      case 'pending':
        return ['confirmed', 'cancelled'];
      case 'confirmed':
        return ['in_progress', 'cancelled'];
      case 'in_progress':
        return ['completed', 'cancelled'];
      case 'completed':
        return ['cancelled'];
      default:
        return [];
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

        {/* Debug Information */}
        <div className="bg-yellow-50 p-2 mb-4 rounded text-xs">
          <p>Debug Info:</p>
          <p>Appointment ID: {appointment.id}</p>
          <p>Status: {appointment.status}</p>
          <p>Image URL: {appointment.beforeImage || 'No image'}</p>
        </div>

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
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {/* Current status */}
                      <SelectItem value={field.value}>
                        {field.value.charAt(0).toUpperCase() + field.value.slice(1).replace('_', ' ')}
                      </SelectItem>
                      {/* Available transitions */}
                      {getStatusTransitions(field.value).map((status) => (
                        <SelectItem key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                        </SelectItem>
                      ))}
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

            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-500">Current Before Image</h3>
              <div className="relative h-48 w-48 border border-gray-200 rounded-md overflow-hidden bg-gray-50">
                {appointment.beforeImage ? (
                  <div className="relative w-full h-full">
                    {isImageLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                        <span className="text-sm text-gray-500">Loading...</span>
                      </div>
                    )}
                    <img
                      key={`${appointment.id}-${appointment.beforeImage}`}
                      src={appointment.beforeImage}
                      alt="Before grooming"
                      className={`w-full h-full object-cover ${isImageLoading ? 'opacity-0' : 'opacity-100'}`}
                      onError={handleImageError}
                      onLoad={handleImageLoad}
                      crossOrigin="anonymous"
                    />
                    {/* Debug info */}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1">
                      URL: {appointment.beforeImage}
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-sm text-gray-500">
                      {imageLoadError ? "Failed to load image" : "No image"}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* File input section */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-500">Upload Before Image</h3>
              <div className="flex items-center gap-4">
                {form.watch("status") === "in_progress" && (
                  <input
                    type="file"
                    accept="image/*"
                    id="before-image-upload"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleImageUpload(file);
                      }
                    }}
                    className="text-sm"
                  />
                )}
              </div>
            </div>


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