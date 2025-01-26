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
  status: z.enum(['pending', 'confirmed', 'completed', 'cancelled', 'in_progress']),
  cancellationReason: z.enum(['no_show', 'rescheduled', 'other']).optional(),
  notes: z.string().optional(),
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
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        status: appointment.status,
        cancellationReason: appointment.cancellationReason || undefined,
        notes: appointment.notes || undefined,
      });
    }
  }, [open, appointment.id]);


  const onSubmit = async (data: UpdateAppointmentForm) => {
    try {
      setIsUpdating(true);

      const previousData = queryClient.getQueryData<AppointmentWithRelations[]>(["appointments"]);

      if (previousData) {
        queryClient.setQueryData<AppointmentWithRelations[]>(
          ["appointments"],
          previousData.map((apt) =>
            apt.id === appointment.id
              ? { ...apt, status: data.status, notes: data.notes || null }
              : apt
          )
        );
      }

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
                  <>
                    <input
                      type="file"
                      accept="image/*"
                      id="before-image-upload"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            console.log('Starting image upload for appointment:', appointment.id);
                            setIsUpdating(true);
                            const path = `appointments/${appointment.id}/before-image.${file.name.split('.').pop()}`;
                            console.log('Upload path:', path);
                            const { uploadFile } = await import("@/lib/storage");
                            const url = await uploadFile(file, path);
                            console.log('Image uploaded successfully, URL:', url);

                            // Update local state immediately for better UX
                            const currentData = queryClient.getQueryData<AppointmentWithRelations[]>(["appointments"]);
                            if (currentData) {
                              queryClient.setQueryData<AppointmentWithRelations[]>(
                                ["appointments"],
                                currentData.map((apt) =>
                                  apt.id === appointment.id
                                    ? { ...apt, beforeImage: url }
                                    : apt
                                )
                              );
                            }

                            await updateAppointment({
                              id: appointment.id,
                              status: form.getValues("status"),
                              beforeImage: url,
                            });

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
                            queryClient.invalidateQueries({ queryKey: ["appointments"] });
                          } finally {
                            setIsUpdating(false);
                            // Reset file input
                            const input = document.getElementById('before-image-upload') as HTMLInputElement;
                            if (input) input.value = '';
                          }
                        }
                      }}
                      className="text-sm"
                    />
                    {appointment.beforeImage && (
                      <div className="mt-2">
                        <>
                          <div className="image-debug-info text-xs mb-2">
                            <p>Attempting to load image from: {appointment.beforeImage}</p>
                          </div>
                          <img
                            src={appointment.beforeImage}
                            alt="Before grooming"
                            className="h-32 w-32 object-cover rounded-md border border-gray-200"
                            referrerPolicy="no-referrer"
                            crossOrigin="anonymous"
                            onLoad={(e) => {
                              console.log('Image loaded successfully:', {
                                src: appointment.beforeImage,
                                naturalWidth: (e.target as HTMLImageElement).naturalWidth,
                                naturalHeight: (e.target as HTMLImageElement).naturalHeight
                              });
                            }}
                            onError={(e) => {
                              console.error('Image load error:', {
                                src: appointment.beforeImage,
                                error: e,
                                timestamp: new Date().toISOString()
                              });
                              // Log response headers if possible
                              if (appointment.beforeImage) {
                                fetch(appointment.beforeImage, { method: 'HEAD' })
                                .then(response => {
                                  console.log('Image URL headers:', {
                                    status: response.status,
                                    statusText: response.statusText,
                                    headers: Object.fromEntries(response.headers.entries())
                                  });
                                })
                                .catch(fetchError => {
                                  console.error('Failed to fetch image headers:', fetchError);
                                });
                              }
                              const img = e.target as HTMLImageElement;
                              img.style.display = 'none';
                            }}
                          />
                        </>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-500">Current Before Image</h3>
              <div className="flex flex-col gap-2">
                {appointment.beforeImage ? (
                  <div className="relative w-32 h-32">
                    <img
                      key={`${appointment.beforeImage}?${Date.now()}`}
                      src={appointment.beforeImage}
                      alt="Before grooming"
                      className="absolute inset-0 w-full h-full object-cover rounded-md border"
                      crossOrigin="use-credentials"
                      loading="eager"
                      onLoad={(e) => {
                        console.log('Image loaded successfully:', appointment.beforeImage);
                        const img = e.target as HTMLImageElement;
                        img.style.opacity = '1';
                      }}
                      onError={(e) => {
                        console.error('Image load error:', {
                          src: appointment.beforeImage,
                          error: e
                        });
                        const img = e.target as HTMLImageElement;
                        img.style.opacity = '0';
                        // Attempt reload with cache-busting
                        img.src = `${appointment.beforeImage}&t=${Date.now()}`;
                      }}
                      style={{
                        opacity: 0,
                        transition: 'opacity 0.3s ease-in-out'
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-md">
                      <span className="text-sm text-gray-500">Loading image...</span>
                    </div>
                  </div>
                ) : (
                  <div className="w-32 h-32 flex items-center justify-center bg-gray-100 rounded-md">
                    <span className="text-sm text-gray-500">No image</span>
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