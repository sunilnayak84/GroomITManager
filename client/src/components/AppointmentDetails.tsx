import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
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
}

const updateAppointmentSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'completed', 'cancelled']),
  cancellationReason: z.enum(['no_show', 'rescheduled', 'other']).optional(),
  notes: z.string().optional(),
});

type UpdateAppointmentForm = z.infer<typeof updateAppointmentSchema>;

const AppointmentDetails = ({
  appointment,
  open,
  onOpenChange,
}: AppointmentDetailsProps): React.ReactElement => {
  const { updateAppointment } = useAppointments();
  const { toast } = useToast();
  const [showCancellationForm, setShowCancellationForm] = useState(false);
  const [showPetDetails, setShowPetDetails] = useState(false);
  const [showCustomerDetails, setShowCustomerDetails] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<UpdateAppointmentForm>({
    resolver: zodResolver(updateAppointmentSchema),
    defaultValues: {
      status: appointment.status,
      cancellationReason: undefined,
      notes: appointment.notes || undefined,
    },
  });

  const onSubmit = async (data: UpdateAppointmentForm) => {
    try {
      setIsUpdating(true);
    
      // Store the previous data for rollback
      const previousData = queryClient.getQueryData<AppointmentWithRelations[]>(["appointments"]);
        
      // Optimistically update the UI
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
        cancellationReason: data.status === 'cancelled' ? data.cancellationReason : undefined,
        notes: data.notes,
      });
      
      toast({
        title: "Success",
        description: "Appointment status updated successfully",
      });
      
      onOpenChange(false);
    } catch (error) {
      // Revert optimistic update on error
      queryClient.setQueryData(["appointments"], previousData);
      
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
              <div 
                className="mt-1 flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                onClick={() => setShowPetDetails(true)}
              >
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
              <div 
                className="mt-1 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                onClick={() => setShowCustomerDetails(true)}
              >
                <p className="text-sm">
                  {appointment.customer.firstName} {appointment.customer.lastName}
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500">Groomer</h3>
              <p className="mt-1 text-sm">{appointment.groomer.name}</p>
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      setShowCancellationForm(value === 'cancelled');
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {showCancellationForm && (
              <FormField
                control={form.control}
                name="cancellationReason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cancellation Reason</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
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

            <div className="flex justify-end space-x-2">
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

      {/* Pet Details Modal */}
      <Dialog open={showPetDetails} onOpenChange={setShowPetDetails}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pet Details</DialogTitle>
          </DialogHeader>
          <PetDetails 
            pet={{
              id: appointment.pet.id,
              firebaseId: null,
              name: appointment.pet.name,
              type: appointment.pet.type,
              breed: appointment.pet.breed,
              customerId: appointment.customer.id,
              image: appointment.pet.image,
              gender: appointment.pet.gender,
              age: appointment.pet.age,
              weight: appointment.pet.weight,
              weightUnit: appointment.pet.weightUnit || 'kg',
              dateOfBirth: appointment.pet.dateOfBirth,
              notes: appointment.pet.notes,
              createdAt: appointment.pet.createdAt,
              updatedAt: appointment.pet.updatedAt,
              owner: {
                id: appointment.customer.id,
                name: `${appointment.customer.firstName} ${appointment.customer.lastName}`,
                email: appointment.customer.email
              }
            }}
            formatDate={format}
          />
        </DialogContent>
      </Dialog>

      {/* Customer Details Modal */}
      <Dialog open={showCustomerDetails} onOpenChange={setShowCustomerDetails}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <img
                src={`https://api.dicebear.com/7.x/initials/svg?seed=${appointment.customer.firstName} ${appointment.customer.lastName}`}
                alt={`${appointment.customer.firstName} ${appointment.customer.lastName}`}
                className="w-16 h-16 rounded-full"
              />
              <div>
                <h2 className="text-xl font-bold">
                  {appointment.customer.firstName} {appointment.customer.lastName}
                </h2>
                <p className="text-sm text-muted-foreground">{appointment.customer.email}</p>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">Contact Information</h3>
              <p><span className="text-muted-foreground">Email:</span> {appointment.customer.email}</p>
              <p><span className="text-muted-foreground">Phone:</span> {appointment.customer.phone}</p>
              {appointment.customer.address && (
                <p><span className="text-muted-foreground">Address:</span> {appointment.customer.address}</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};

export default AppointmentDetails;