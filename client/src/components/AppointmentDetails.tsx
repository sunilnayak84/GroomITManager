import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePets } from "@/hooks/use-pets";
import { useCustomers } from "@/hooks/use-customers";
import { Loader2 } from "lucide-react";
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
  const { getPetById } = usePets();
  const { getCustomerById } = useCustomers();
  const [fullPetData, setFullPetData] = useState<any>(null); // Updated state for full pet data
  const [fullCustomerData, setFullCustomerData] = useState<any>(null); // Updated state for full customer data
  const [loadingPet, setLoadingPet] = useState(false); // Loading states
  const [loadingCustomer, setLoadingCustomer] = useState(false);

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
        cancellationReason: data.status === 'cancelled' ? data.cancellationReason : undefined,
        notes: data.notes,
      });
      toast({
        title: "Success",
        description: "Appointment status updated successfully",
      });
      onOpenChange(false);
    } catch (error) {
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

  useEffect(() => {
    const fetchPetData = async () => {
      setLoadingPet(true);
      try {
        const data = await getPetById(appointment.pet.id);
        setFullPetData(data);
      } catch (error) {
        console.error("Error fetching pet data:", error);
      } finally {
        setLoadingPet(false);
      }
    };
    const fetchCustomerData = async () => {
      setLoadingCustomer(true);
      try {
        const data = await getCustomerById(appointment.customer.id);
        setFullCustomerData(data);
      } catch (error) {
        console.error("Error fetching customer data:", error);
      } finally {
        setLoadingCustomer(false);
      }
    };

    fetchPetData();
    fetchCustomerData();

  }, [getPetById, appointment.pet.id, getCustomerById, appointment.customer.id]);


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
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Pet Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Pet Header */}
            <div className="flex items-center gap-4">
              <img
                src={appointment.pet.image || `https://api.dicebear.com/7.x/adventurer/svg?seed=${appointment.pet.name}`}
                alt={appointment.pet.name}
                className="w-16 h-16 rounded-full object-cover"
              />
              <div>
                <h2 className="text-xl font-bold">{appointment.pet.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {appointment.pet.breed}
                </p>
              </div>
            </div>

            {/* Pet Details */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">Basic Information</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Breed:</span>
                    <span>{appointment.pet.breed}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Owner:</span>
                    <span>{appointment.customer.firstName} {appointment.customer.lastName}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Appointment History</h3>
                <div className="text-sm text-muted-foreground">
                  Current appointment scheduled for {format(new Date(appointment.date), "PPP")}
                </div>
              </div>
            </div>

            {/* Notes Section */}
            <div>
              <h3 className="font-semibold mb-2">Notes</h3>
              <div className="text-sm text-muted-foreground">
                {appointment.notes || "No notes available"}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Customer Details Modal */}
      <Dialog open={showCustomerDetails} onOpenChange={setShowCustomerDetails}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Customer Header */}
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
              </div>
            </div>

            {/* Customer Details */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">Contact Information</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Email:</span>
                    <span>{appointment.customer.email}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Phone:</span>
                    <span>{appointment.customer.phone}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Pets</h3>
                <div className="text-sm text-muted-foreground">
                  Currently viewing appointment for {appointment.pet.name}
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div>
              <h3 className="font-semibold mb-2">Additional Information</h3>
              <div className="text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>Address:</span>
                  <span>{appointment.customer.address || "Not provided"}</span>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};

export default AppointmentDetails;