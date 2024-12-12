import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import type { AppointmentWithRelations } from "@/lib/schema";

interface AppointmentDetailsProps {
  appointment: AppointmentWithRelations;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AppointmentDetails({
  appointment,
  open,
  onOpenChange,
}: AppointmentDetailsProps) {
  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Appointment Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
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
            <p className="text-sm text-gray-500">{appointment.customer.email}</p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500">Groomer</h3>
            <p className="mt-1 text-sm">{appointment.groomer.name}</p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500">Status</h3>
            <Badge className={`mt-1 ${statusColors[appointment.status]}`}>
              {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
            </Badge>
          </div>

          {appointment.notes && (
            <div>
              <h3 className="text-sm font-medium text-gray-500">Notes</h3>
              <p className="mt-1 text-sm">{appointment.notes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
