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

            {form.watch("status") === "in_progress" && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-500">Before Image</h3>
                <div className="flex items-center gap-4">
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
                </div>
                {appointment.beforeImage && (
                  <div className="mt-2">
                    <div className="relative">
                      <img
                        key={`before-image-${appointment.id}-${Date.now()}`}
                        src={appointment.beforeImage}
                        alt="Before grooming"
                        className="h-32 w-32 object-cover rounded-md border border-gray-200"
                        loading="eager"
                        onLoad={(e) => {
                          const img = e.target as HTMLImageElement;
                          console.log('Image loaded successfully:', {
                            src: img.src,
                            naturalWidth: img.naturalWidth,
                            naturalHeight: img.naturalHeight,
                            displayWidth: img.width,
                            displayHeight: img.height
                          });
                        }}
                        onError={(e) => {
                          const img = e.target as HTMLImageElement;
                          console.error('Image failed to load:', {
                            src: img.src,
                            error: e,
                            currentTarget: e.currentTarget,
                            timestamp: new Date().toISOString()
                          });
                        }}
                        crossOrigin="anonymous"
                        referrerPolicy="no-referrer"
                        style={{ minHeight: '128px', minWidth: '128px', background: '#f3f4f6' }}
                      />
                      {/* Fallback text for debugging */}
                      <div className="mt-1 text-xs text-gray-500">
                        Image URL: {appointment.beforeImage.substring(0, 50)}...
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {appointment.beforeImage && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-500">Current Before Image</h3>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img
                      key={`before-image-${appointment.id}-${Date.now()}`}
                      src={appointment.beforeImage || ''}
                      alt="Before grooming"
                      className="h-32 w-32 object-cover rounded-md border cursor-pointer"
                      onClick={() => appointment.beforeImage && window.open(appointment.beforeImage, '_blank')}
                      onLoad={() => {
                        console.log('Image loaded successfully:', appointment.beforeImage);
                      }}
                      onError={(e) => {
                        console.error('Image failed to load:', appointment.beforeImage);
                        console.error('Error event:', e);
                        const img = e.target as HTMLImageElement;
                        img.style.display = 'none';
                      }}
                      crossOrigin="anonymous"
                    />
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={async () => {
                      try {
                        setIsUpdating(true);
                        await updateAppointment({
                          id: appointment.id,
                          status: form.getValues("status"),
                          beforeImage: '',
                        });
                        toast({
                          title: "Success",
                          description: "Before image removed successfully",
                        });
                      } catch (error) {
                        toast({
                          variant: "destructive",
                          title: "Error",
                          description: "Failed to remove before image",
                        });
                      } finally {
                        setIsUpdating(false);
                      }
                    }}
                  >
                    Remove Image
                  </Button>
                </div>
              </div>
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