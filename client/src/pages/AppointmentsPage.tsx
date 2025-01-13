import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, List, Trash2, Pencil } from "lucide-react"; // Added Pencil icon
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";
import { useAppointments } from "../hooks/use-appointments";
import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog";
import AppointmentForm from "../components/AppointmentForm";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { z } from "zod";
import { appointmentSchema, type Appointment, type AppointmentWithRelations } from "@/lib/schema";
import AppointmentDetails from "../components/AppointmentDetails";
import AppointmentCalendar from "../components/AppointmentCalendar";
import AppointmentEditForm from "../components/AppointmentEditForm"; // Added import for edit form
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Added Select component imports
import { PetDetails } from "../components/PetDetails";
import { usePets } from "../hooks/use-pets";


// Get status type from the schema
interface ActionButtonsProps {
  appointment: AppointmentWithRelations;
  onView: () => void;
  onEdit: () => void; // Added onEdit prop
}

function ActionButtons({ appointment, onView, onEdit }: ActionButtonsProps) { // Added onEdit prop
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
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit} // Use onEdit prop
            className="text-primary hover:text-primary" // Changed styling for edit button
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </>
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
  const [openEdit, setOpenEdit] = useState(false); // Added openEdit state
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithRelations | null>(null);
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [showPetDetails, setShowPetDetails] = useState(false);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const { pets } = usePets();
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'past' | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'>('all');
  const { data: appointments, isLoading, error } = useAppointments();

  const filteredAppointments = useMemo(() => {
    if (!appointments) return [];

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return appointments.filter(appointment => {
      const appointmentDate = new Date(appointment.date);

      // Apply date filter
      if (dateFilter === 'today') {
        if (appointmentDate < startOfDay || appointmentDate > new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)) {
          return false;
        }
      } else if (dateFilter === 'week') {
        if (appointmentDate < startOfWeek || appointmentDate > new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000)) {
          return false;
        }
      } else if (dateFilter === 'month') {
        if (appointmentDate < startOfMonth || appointmentDate > new Date(now.getFullYear(), now.getMonth() + 1, 0)) {
          return false;
        }
      } else if (dateFilter === 'past') {
        if (appointmentDate > now) {
          return false;
        }
      }

      // Apply status filter
      if (statusFilter !== 'all' && appointment.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [appointments, dateFilter, statusFilter]);

  const columns = [
    {
      header: "Date",
      cell: ({ date }: AppointmentWithRelations) => format(new Date(date), "PPp"),
    },
    {
      header: "Pet",
      cell: ({ pet }: AppointmentWithRelations) => (
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => {setSelectedPetId(pet.id); setShowPetDetails(true);}}>
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
          {row.service && row.service.length > 1 ? (
            <div>
              <div className="font-medium">Multiple Services</div>
              <div className="text-sm text-muted-foreground">
                {row.service.length} services selected
              </div>
            </div>
          ) : (
            <div>
              <div className="font-medium">{row.service?.[0]?.name || 'Unknown Service'}</div>
              {row.service?.[0]?.price && (
                <div className="text-sm text-muted-foreground">
                  ₹{row.service[0].price}
                </div>
              )}
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
          onEdit={() => { // Added onEdit handler
            setSelectedAppointment(row);
            setOpenEdit(true); // Open the edit dialog
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

      {view === 'list' && (
        <div className="flex gap-4 mb-4 px-6">
          <Select
            value={dateFilter}
            onValueChange={(value: any) => setDateFilter(value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Appointments</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="past">Past Appointments</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={statusFilter}
            onValueChange={(value: any) => setStatusFilter(value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {view === 'list' ? (
        <div className="bg-white rounded-lg border shadow-sm">
          <DataTable
            columns={columns}
            data={filteredAppointments as AppointmentWithRelations[]}
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
        <>
          <AppointmentDetails
            appointment={selectedAppointment}
            open={openDetails}
            onOpenChange={setOpenDetails}
            onEdit={() => setOpenEdit(true)}
          />
          <Dialog open={openEdit} onOpenChange={setOpenEdit}> {/* Added Edit Dialog */}
            <DialogTrigger asChild>
              {/* This trigger is already handled in ActionButtons */}
            </DialogTrigger>
            <AppointmentEditForm appointment={selectedAppointment} setOpen={setOpenEdit} /> {/* Added Edit Form */}
          </Dialog>
        </>
      )}

      {/* Pet Details Dialog */}
      <Dialog open={showPetDetails} onOpenChange={setShowPetDetails}>
        <DialogContent className="sm:max-w-[625px]">
          {selectedPetId && pets?.find(p => p.id === selectedPetId) && (
            <PetDetails
              pet={pets.find(p => p.id === selectedPetId)!}
              formatDate={(date) => date ? format(new Date(date), 'PPP') : 'Not specified'}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}