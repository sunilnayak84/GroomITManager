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

  // Effect to reset image states when appointment changes
  useEffect(() => {
    setIsImageLoading(!!appointment.beforeImage);
    setImageLoadError(false);
  }, [appointment.id, appointment.beforeImage]);

  const handleImageError = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.error('Image load error:', {
      url: appointment.beforeImage,
      error: event,
      timestamp: new Date().toISOString()
    });
    setImageLoadError(true);
    setIsImageLoading(false);
  };

  const handleImageLoad = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.log('Image loaded successfully:', {
      url: appointment.beforeImage,
      timestamp: new Date().toISOString()
    });
    setImageLoadError(false);
    setIsImageLoading(false);
  };

  const queryClient = useQueryClient();
  const form = useForm<UpdateAppointmentForm>({
    resolver: zodResolver(updateAppointmentSchema),
    defaultValues: {
      status: appointment.status,
      cancellationReason: appointment.cancellationReason || undefined,
      notes: appointment.notes || undefined,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        status: appointment.status,
        cancellationReason: appointment.cancellationReason || undefined,
        notes: appointment.notes || undefined,
      });
    }
  }, [open, appointment.id, form]);

  const onSubmit = async (data: UpdateAppointmentForm) => {
    try {
      setIsUpdating(true);
      await updateAppointment({
        id: appointment.id,
        status: data.status,
        cancellationReason: data.status === 'cancelled' ? data.cancellationReason || undefined : undefined,
        notes: data.notes,
      });

      toast({
        title: "Success",
        description: "Appointment status updated successfully",
      });

      onOpenChange(false);
    } catch (error) {
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
                      {appointment.status !== 'in_progress' && (
                        <>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="confirmed">Confirmed</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                        </>
                      )}
                      {(appointment.status === 'in_progress' || appointment.status === 'completed' || appointment.status === 'cancelled') && (
                        <>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </>
                      )}
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
              <h3 className="text-sm font-medium text-gray-500">Before Image</h3>
              <div className="flex items-center gap-4">
                {form.watch("status") === "in_progress" && (
                  <input
                    type="file"
                    accept="image/*"
                    id="before-image-upload"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          if (file.size > 5 * 1024 * 1024) {
                            throw new Error('File size must be less than 5MB');
                          }

                          setIsUpdating(true);
                          const timestamp = Date.now();
                          const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
                          const path = `appointments/${appointment.id}/before-image-${timestamp}.${extension}`;

                          const { uploadFile } = await import("@/lib/storage");
                          const url = await uploadFile(file, path);

                          console.log('Image uploaded successfully:', url);

                          // Reset error state on new upload
                          setImageLoadError(false);
                          setIsImageLoading(true);

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
                      }
                    }}
                    className="text-sm"
                  />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-500">Current Before Image</h3>
              <div className="relative w-32 h-32 border border-gray-200 rounded-md overflow-hidden bg-gray-50">
                {appointment.beforeImage ? (
                  <>
                    {isImageLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                        <span className="text-sm text-gray-500">Loading...</span>
                      </div>
                    )}
                    <img
                      key={`${appointment.id}-${appointment.beforeImage}`}
                      src={appointment.beforeImage}
                      alt="Before grooming"
                      className={`h-32 w-32 object-cover transition-opacity duration-200 ${
                        isImageLoading ? 'opacity-0' : 'opacity-100'
                      }`}
                      onError={handleImageError}
                      onLoad={handleImageLoad}
                      crossOrigin="anonymous"
                      referrerPolicy="no-referrer"
                    />
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <span className="text-sm text-gray-500">
                      {imageLoadError ? "Failed to load image" : "No image"}
                    </span>
                  </div>
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