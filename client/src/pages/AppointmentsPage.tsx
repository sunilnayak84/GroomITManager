import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, List, Trash2 } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";
import { useAppointments } from "../hooks/use-appointments";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import AppointmentForm from "../components/AppointmentForm";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { z } from "zod";
import { appointmentSchema, type Appointment, type AppointmentWithRelations } from "@/lib/schema";
import AppointmentDetails from "../components/AppointmentDetails";
import AppointmentCalendar from "../components/AppointmentCalendar";

// Get status type from the schema
interface ActionButtonsProps {
  appointment: AppointmentWithRelations;
  onView: () => void;
}

function ActionButtons({ appointment, onView }: ActionButtonsProps) {
  const { user } = useUser();
  const { deleteAppointment } = useAppointments();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteAppointment) {
      console.error('Delete appointment function is not available');
      return;
    }

    if (confirm("Are you sure you want to delete this appointment? This action cannot be undone.")) {
      try {
        setIsDeleting(true);
        await deleteAppointment(appointment.id);
        toast({
          title: "Success",
          description: "Appointment deleted successfully",
        });
      } catch (error) {
        console.error('Error deleting appointment:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to delete appointment",
        });
      } finally {
        setIsDeleting(false);
      }
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button 
        variant="outline" 
        size="sm" 
        onClick={onView}
      >
        View
      </Button>
      {user?.role === 'admin' && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleDelete}
          disabled={isDeleting}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
type AppointmentStatus = z.infer<typeof appointmentSchema>["status"];

const statusColors: Record<AppointmentStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function AppointmentsPage() {
  const [openNewForm, setOpenNewForm] = useState(false);
  const [openDetails, setOpenDetails] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithRelations | null>(null);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const { data: appointments, isLoading, error } = useAppointments();
  
  const columns = [
    {
      header: "Date",
      cell: ({ date }: AppointmentWithRelations) => format(new Date(date), "PPp"),
    },
    {
      header: "Pet",
      cell: ({ pet }: AppointmentWithRelations) => (
        <div className="flex items-center gap-2">
          <img
            src={pet.image || `https://api.dicebear.com/7.x/adventurer/svg?seed=${pet.name}`}
            alt={pet.name}
            className="w-8 h-8 rounded-full"
          />
          <div>
            <div className="font-medium">{pet.name}</div>
            <div className="text-sm text-muted-foreground">{pet.breed}</div>
          </div>
        </div>
      ),
    },
    {
      header: "Customer",
      cell: (row: AppointmentWithRelations) => (
        <div className="font-medium">
          {`${row.customer.firstName} ${row.customer.lastName}`}
        </div>
      ),
    },
    {
      header: "Groomer",
      cell: (row: AppointmentWithRelations) => row.groomer.name,
    },
    {
      header: "Service",
      cell: (row: AppointmentWithRelations) => (
        <div>
          <div className="font-medium">{row.service?.name || 'Unknown Service'}</div>
          {row.service?.price && (
            <div className="text-sm text-muted-foreground">
              ₹{row.service.price}
            </div>
          )}
        </div>
      ),
    },
    {
      header: "Status",
      cell: ({ status }: AppointmentWithRelations) => (
        <Badge className={statusColors[status]}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>
      ),
    },
    {
      header: "Actions",
      cell: (row: AppointmentWithRelations) => (
        <ActionButtons
          appointment={row}
          onView={() => {
            setSelectedAppointment(row);
            setOpenDetails(true);
          }}
        />
      ),
    },
  ];

  return (
    <div className="container mx-auto max-w-7xl space-y-6 px-6">
      <div className="relative h-48 rounded-xl overflow-hidden bg-gradient-to-r from-purple-500/80 to-purple-500/20 mb-6">
        <img
          src="https://images.unsplash.com/photo-1727681200732-0086492c217d"
          alt="Pet Grooming"
          className="w-full h-full object-cover mix-blend-overlay"
        />
        <div className="absolute inset-0 flex items-center p-8">
          <div className="flex items-center justify-between w-full">
            <div className="text-white">
              <h1 className="text-2xl font-bold">Appointments</h1>
              <p className="text-white/80">Manage your pet grooming appointments</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex rounded-lg bg-white/10 p-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`${view === 'list' ? 'bg-white text-purple-950' : 'text-white hover:bg-white/20'}`}
                  onClick={() => setView('list')}
                >
                  <List className="mr-2 h-4 w-4" />
                  List
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`${view === 'calendar' ? 'bg-white text-purple-950' : 'text-white hover:bg-white/20'}`}
                  onClick={() => setView('calendar')}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Calendar
                </Button>
              </div>
              <Dialog open={openNewForm} onOpenChange={setOpenNewForm}>
                <DialogTrigger asChild>
                  <Button variant="secondary">
                    <Plus className="mr-2 h-4 w-4" />
                    New Appointment
                  </Button>
                </DialogTrigger>
                <AppointmentForm setOpen={setOpenNewForm} />
              </Dialog>
            </div>
          </div>
        </div>
      </div>

      {view === 'list' ? (
        <div className="bg-white rounded-lg border shadow-sm">
          <DataTable
            columns={columns}
            data={(appointments || []) as AppointmentWithRelations[]}
            isLoading={isLoading}
          />
        </div>
      ) : (
        <AppointmentCalendar 
          setSelectedAppointment={setSelectedAppointment}
          setOpenDetails={setOpenDetails}
        />
      )}

      {selectedAppointment && (
        <AppointmentDetails
          appointment={selectedAppointment}
          open={openDetails}
          onOpenChange={setOpenDetails}
        />
      )}
    </div>
  );
}