import React, { useState, useEffect } from "react";
import { useInventory } from "@/hooks/use-inventory";
import { useUser } from "@/hooks/use-user";
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
import type { AppointmentWithRelations, AppointmentImage } from "@/lib/schema";
import { useAppointments } from "@/hooks/use-appointments";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { ImageCarousel } from './ui/image-carousel';

const updateAppointmentSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'completed', 'cancelled', 'in_progress']),
  cancellationReason: z.enum(['no_show', 'rescheduled', 'other']).optional(),
  notes: z.string().nullable().optional(),
  observations: z.string().nullable().optional(),
  recommendations: z.string().nullable().optional(),
  afterImages: z.array(z.object({
    id: z.string(),
    url: z.string(),
    type: z.enum(['after', 'before']),
    timestamp: z.string(),
  })).optional(),
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
  const { inventory, recordUsage } = useInventory();
  const { user } = useUser();
  const { updateAppointment } = useAppointments();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);
  const queryClient = useQueryClient();
  const [selectedService, setSelectedService] = useState<null | any>(null);
  const [selectedCategory, setSelectedCategory] = useState<null | string>(null);
  const [isUsageModalOpen, setIsUsageModalOpen] = useState(false);


  const isTerminalStatus = appointment.status === 'completed' || appointment.status === 'cancelled';

  useEffect(() => {
    if (open) {
      form.reset({
        status: appointment.status,
        cancellationReason: appointment.cancellationReason || undefined,
        notes: appointment.notes || undefined,
        observations: appointment.observations || undefined,
        recommendations: appointment.recommendations || undefined,
        afterImages: appointment.afterImages || undefined,
      });
    }
  }, [open, appointment]);

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.error('Error loading image:', e);
    setImageLoadError(true);
    setIsImageLoading(false);
  };

  const form = useForm<UpdateAppointmentForm>({
    resolver: zodResolver(updateAppointmentSchema),
    defaultValues: {
      status: appointment.status,
      cancellationReason: appointment.cancellationReason || undefined,
      notes: appointment.notes || undefined,
      observations: appointment.observations || undefined,
      recommendations: appointment.recommendations || undefined,
      afterImages: appointment.afterImages || undefined,
    },
  });

  const onSubmit = async (data: UpdateAppointmentForm) => {
    try {
      setIsUpdating(true);

      const updateData: Parameters<typeof updateAppointment>[0] = {
        id: appointment.id,
        status: data.status,
        notes: data.notes ?? null,
        afterImages: data.afterImages,
        observations: data.observations ?? null,
        recommendations: data.recommendations ?? null,
      };

      // Only add fields based on status
      if (data.status === 'cancelled' && data.cancellationReason) {
        updateData.cancellationReason = data.cancellationReason;
      }

      console.log('Submitting appointment update:', updateData);

      await updateAppointment(updateData);

      await queryClient.invalidateQueries({ 
        queryKey: ["appointments"],
        exact: true
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

  // Combine legacy single image with new image array
  const allBeforeImages = React.useMemo(() => {
    if (appointment.beforeImages?.length) {
      return appointment.beforeImages;
    }
    if (appointment.beforeImage) {
      return [{
        id: 'legacy',
        url: appointment.beforeImage,
        type: 'before' as const,
        timestamp: appointment.updatedAt || appointment.createdAt
      }];
    }
    return [];
  }, [appointment.beforeImages, appointment.beforeImage, appointment.updatedAt, appointment.createdAt]);

  const getServiceCategories = (service: any) => {
    if(service && service.pack){
        return service.pack.services.flatMap((s: any) => s.consumables || []);
    } else if (service){
        return service.consumables || [];
    } else {
        return [];
    }
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Appointment Details</DialogTitle>
          <DialogDescription>
            {isTerminalStatus 
              ? "This appointment is completed/cancelled and cannot be modified"
              : "View and manage appointment information"
            }
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
                  onError={handleImageError}
                />
                <div>
                  <p className="text-sm font-medium">{appointment.pet.name}</p>
                  <p className="text-sm text-gray-500">{appointment.pet.breed}</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500">Services</h3>
              <div className="mt-1 space-y-2">
                {appointment.service?.map((service) => (
                  <div key={service.service_id} className="text-sm">
                    <p className="font-medium">{service.name}</p>
                    <p className="text-gray-500">
                      Duration: {service.duration} minutes | Price: ₹{service.price}
                    </p>
                    {service.description && (
                      <p className="text-gray-500">{service.description}</p>
                    )}
                  </div>
                ))}
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

            {(form.watch("status") === "in_progress" || form.watch("status") === "completed") && (
              <div>
                <h3 className="text-sm font-medium text-gray-500">Before Images</h3>
                <ImageCarousel
                  images={allBeforeImages}
                  type="before"
                  onImageDelete={async (imageId) => {
                    try {
                      setIsUpdating(true);
                      const updatedImages = allBeforeImages.filter(img => img.id !== imageId);
                      await updateAppointment({
                        id: appointment.id,
                        status: form.getValues("status"),
                        beforeImages: updatedImages,
                      });

                      // Force dialog to stay open
                      onOpenChange(true);

                      toast({
                        title: "Success",
                        description: "Image deleted successfully",
                      });

                      // Refresh data without closing dialog
                      await queryClient.invalidateQueries({ 
                        queryKey: ["appointments"],
                        exact: true,
                      });
                    } catch (error) {
                      toast({
                        variant: "destructive",
                        title: "Error",
                        description: error instanceof Error ? error.message : "Failed to delete image",
                      });
                    } finally {
                      setIsUpdating(false);
                    }
                  }}
                  onImageUpload={async (file) => {
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

                    const newImage: AppointmentImage = {
                      id: `${timestamp}`,
                      url,
                      type: 'before',
                      timestamp: new Date().toISOString(),
                    };

                    const updatedBeforeImages = [...allBeforeImages, newImage];

                    await updateAppointment({
                      id: appointment.id,
                      status: form.getValues("status"),
                      beforeImages: updatedBeforeImages,
                    });

                    await queryClient.invalidateQueries({ 
                      queryKey: ["appointments"],
                      exact: true
                    });

                    toast({
                      title: "Success",
                      description: "Before image uploaded successfully",
                    });
                  } catch (error) {
                    setImageLoadError(true);
                    toast({
                      variant: "destructive",
                      title: "Error",
                      description: error instanceof Error ? error.message : "Failed to upload image",
                    });
                  } finally {
                    setIsUpdating(false);
                    setIsImageLoading(false);
                  }
                }}
                className="mt-2"
              />
              </div>
            )}

            {form.watch("status") === "completed" && (
              <>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Inventory Usage</h3>
                  <div className="mt-2 space-y-4">
                    {appointment.service?.map((service) => (
                      <div key={service.service_id} className="border rounded-lg p-4">
                        <h4 className="font-medium">{service.name}</h4>
                        {service.consumables?.map((category) => {
                          const categoryName = typeof category === 'object' ? (category as any).item_name : category;
                          const items = inventory?.filter(item => 
                            item.category.toLowerCase() === categoryName.toLowerCase() && 
                            item.quantity > 0
                          ) || [];
                          
                          return (
                            <div key={categoryName} className="mt-2">
                              <h5 className="text-sm text-gray-600">{categoryName}</h5>
                              <Select
                                onValueChange={async (itemId) => {
                                  const item = inventory?.find(i => i.item_id === itemId);
                                  if (!item || !user?.id) return;
                                  
                                  try {
                                    await recordUsage({
                                      item_id: itemId,
                                      quantity_used: item.quantity_per_use,
                                      used_by: user.id,
                                      appointment_id: appointment.id,
                                      service_id: service.service_id,
                                      notes: `Used for ${service.name}`,
                                      service_linked: true,
                                      auto_deducted: true
                                    });
                                    
                                    toast({
                                      title: "Success",
                                      description: `Recorded usage of ${item.name}`,
                                    });
                                  } catch (error) {
                                    toast({
                                      variant: "destructive",
                                      title: "Error",
                                      description: error instanceof Error ? error.message : "Failed to record usage",
                                    });
                                  }
                                }}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Select item to use" />
                                </SelectTrigger>
                                <SelectContent>
                                  {items.map((item) => (
                                    <SelectItem 
                                      key={item.item_id} 
                                      value={item.item_id}
                                    >
                                      {item.name} ({item.quantity} {item.unit} available)
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500">After Images</h3>
                  <ImageCarousel
                    images={form.watch("afterImages") || []}
                    type="after"
                    onImageUpload={async (file) => {
                      try {
                        if (file.size > 5 * 1024 * 1024) {
                          throw new Error('File size must be less than 5MB');
                        }

                        setIsImageLoading(true);
                        const timestamp = Date.now();
                        const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
                        const path = `appointments/${appointment.id}/after-image-${timestamp}.${extension}`;

                        const { uploadFile } = await import("@/lib/storage");
                        const url = await uploadFile(file, path);

                        const newImage: AppointmentImage = {
                          id: `${timestamp}`,
                          url,
                          type: 'after',
                          timestamp: new Date().toISOString(),
                        };

                        // Update form state without saving to database
                        form.setValue("afterImages", [...(form.watch("afterImages") || []), newImage]);

                        toast({
                          title: "Success",
                          description: "After image uploaded successfully. Don't forget to click Update Appointment to save all changes.",
                        });
                      } catch (error) {
                        setImageLoadError(true);
                        toast({
                          variant: "destructive",
                          title: "Error",
                          description: error instanceof Error ? error.message : "Failed to upload image",
                        });
                      } finally {
                        setIsImageLoading(false);
                      }
                    }}
                    className="mt-2"
                  />
                </div>

                <FormField
                  control={form.control}
                  name="observations"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observations</FormLabel>
                      <FormControl>
                        <textarea
                          {...field}
                          value={field.value || ''}
                          className="min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                          placeholder="Enter any observations about the pet's grooming session"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="recommendations"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recommendations</FormLabel>
                      <FormControl>
                        <textarea
                          {...field}
                          value={field.value || ''}
                          className="min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                          placeholder="Enter recommendations for future grooming"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {form.watch("status") === "cancelled" && (
              <FormField
                control={form.control}
                name="cancellationReason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cancellation Reason</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value || "no_show"} 
                    >
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

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value}
                    disabled={isTerminalStatus}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={field.value || 'pending'}>
                        {(field.value || 'pending').charAt(0).toUpperCase() + (field.value || 'pending').slice(1).replace('_', ' ')}
                      </SelectItem>
                      {!isTerminalStatus && getStatusTransitions(field.value).map((status) => (
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

            <div className="flex justify-end space-x-2 mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
              {!isTerminalStatus && (
                <Button
                  type="submit"
                  disabled={isUpdating || isTerminalStatus}
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
              )}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AppointmentDetails;