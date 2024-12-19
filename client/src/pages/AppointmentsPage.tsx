import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, List, Trash2, Pencil } from "lucide-react";
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PetDetails } from "@/components/PetDetails";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useUser } from "@/hooks/use-user";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAppointments } from "../hooks/use-appointments";
import AppointmentForm from "../components/AppointmentForm";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { z } from "zod";
import { appointmentSchema, type Appointment, type AppointmentWithRelations } from "@/lib/schema";
import AppointmentDetails from "../components/AppointmentDetails";
import AppointmentCalendar from "../components/AppointmentCalendar";
import AppointmentEditForm from "../components/AppointmentEditForm";


// Get status type from the schema
interface ActionButtonsProps {
  appointment: AppointmentWithRelations;
  onView: () => void;
  onEdit: () => void;
}

function ActionButtons({ appointment, onView, onEdit }: ActionButtonsProps) {
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
            onClick={onEdit}
            className="text-primary hover:text-primary"
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
  const [openEdit, setOpenEdit] = useState(false);
  const [showPetDetails, setShowPetDetails] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithRelations | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [selectedPet, setSelectedPet] = useState<any>(null);
  const [showCustomerDetails, setShowCustomerDetails] = useState(false);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'day' | 'week' | 'month'>('day');
  const { data: appointments, isLoading, error } = useAppointments();
  
  // Handle route parameter for appointment ID
  useEffect(() => {
    const pathParts = window.location.pathname.split('/');
    const appointmentId = pathParts[pathParts.length - 1];
    
    if (appointmentId && appointments) {
      const appointment = appointments.find(apt => apt.id === appointmentId);
      if (appointment) {
        setSelectedAppointment(appointment);
        setOpenDetails(true);
      }
    }
  }, [appointments]);

  const filteredAndSortedAppointments = useMemo(() => {
    if (!appointments) return [];
    
    let filtered = [...appointments];
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(app => app.status === statusFilter);
    }

    // Apply date range filter
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    filtered = filtered.filter(app => {
      const appointmentDate = new Date(app.date);
      
      switch (dateRange) {
        case 'day':
          return appointmentDate >= startOfDay && 
                 appointmentDate < new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
        case 'week':
          const endOfWeek = new Date(startOfDay.getTime() + 7 * 24 * 60 * 60 * 1000);
          return appointmentDate >= startOfDay && appointmentDate < endOfWeek;
        case 'month':
          const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          return appointmentDate >= startOfDay && appointmentDate <= endOfMonth;
        default:
          return true;
      }
    });

    // Sort by date
    return filtered.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });
  }, [appointments, sortOrder, statusFilter, dateRange]); // Added dateRange to dependencies
  
  const columns = [
    {
      header: "Appointment Time",
      cell: ({ date, totalDuration }: AppointmentWithRelations) => {
        const startTime = new Date(date);
        const endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + (totalDuration || 30));
        
        return (
          <div className="space-y-1">
            <div className="font-medium">{format(startTime, "PP")}</div>
            <div className="text-sm text-muted-foreground">
              {format(startTime, "h:mm a")} - {format(endTime, "h:mm a")}
            </div>
          </div>
        );
      },
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
          <div 
            className="cursor-pointer"
            onClick={() => {
              const petDoc = doc(db, 'pets', pet.id);
              getDoc(petDoc).then((docSnap) => {
                if (docSnap.exists()) {
                  const petData = docSnap.data();
                  setSelectedPet({
                    id: docSnap.id,
                    ...petData,
                    createdAt: petData.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
                    updatedAt: petData.updatedAt?.toDate?.()?.toISOString() || null,
                    owner: pet.owner || null
                  });
                  setShowPetDetails(true);
                }
              });
            }}
          >
            <div className="font-medium">{pet.name}</div>
            <div className="text-sm text-muted-foreground">{pet.breed}</div>
          </div>
          {selectedPet && (
            <Dialog open={showPetDetails} onOpenChange={setShowPetDetails}>
              <DialogContent>
                <PetDetails 
                  pet={selectedPet}
                  formatDate={(date) => date ? new Date(date).toLocaleDateString() : 'Not specified'}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
      ),
    },
    {
      header: "Customer",
      cell: (row: AppointmentWithRelations) => (
        <div 
          className="font-medium cursor-pointer hover:text-primary transition-colors"
          onClick={() => {
            setSelectedCustomer(row.customer);
            setShowCustomerDetails(true);
          }}
        >
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
          onEdit={() => {
            setSelectedAppointment(row);
            setOpenEdit(true);
          }}
        />
      ),
    },
  ];

  return (
    <div className="container mx-auto max-w-7xl space-y-6 px-6">
      <div className="relative h-48 rounded-xl overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1516734212186-a967f81ad0d7"
          alt="Professional Pet Grooming Services"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-transparent flex items-center p-8">
          <div className="flex items-center justify-between w-full">
            <div className="text-white">
              <h1 className="text-white/95 text-2xl font-bold">Appointments</h1>
              <p className="text-white/80">Manage your pet grooming appointments</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <div className="flex rounded-lg bg-white/10 p-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`${view === 'list' ? 'bg-white text-purple-950' : 'text-white/90 hover:bg-white/20 font-medium'}`}
                  onClick={() => setView('list')}
                >
                  <List className="mr-2 h-4 w-4" />
                  List
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`${view === 'calendar' ? 'bg-white text-purple-950' : 'text-white/90 hover:bg-white/20 font-medium'}`}
                  onClick={() => setView('calendar')}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Calendar
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                <Select
                  value={statusFilter}
                  onValueChange={(value) => setStatusFilter(value)}
                >
                  <SelectTrigger className="w-[150px] bg-white">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex rounded-lg bg-white/10 p-1 mr-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`${dateRange === 'day' ? 'bg-white text-purple-950' : 'text-white/90 hover:bg-white/20 font-medium'}`}
                  onClick={() => setDateRange('day')}
                >
                  Day
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`${dateRange === 'week' ? 'bg-white text-purple-950' : 'text-white/90 hover:bg-white/20 font-medium'}`}
                  onClick={() => setDateRange('week')}
                >
                  Week
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`${dateRange === 'month' ? 'bg-white text-purple-950' : 'text-white/90 hover:bg-white/20 font-medium'}`}
                  onClick={() => setDateRange('month')}
                >
                  Month
                </Button>
              </div>
              <Button
                variant="outline"
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="bg-white"
              >
                Sort {sortOrder === 'asc' ? '↑' : '↓'}
              </Button>
              </div>
            </div>
          </div>
        </div>
        <Dialog open={openNewForm} onOpenChange={setOpenNewForm}>
          <DialogTrigger asChild>
            <Button variant="secondary" className="fixed bottom-6 right-6">
              <Plus className="mr-2 h-4 w-4" />
              New Appointment
            </Button>
          </DialogTrigger>
          <AppointmentForm setOpen={setOpenNewForm} open={openNewForm} />
        </Dialog>
      </div>

      {view === 'list' ? (
        <div className="bg-white rounded-lg border shadow-sm">
          <DataTable
            columns={columns}
            data={filteredAndSortedAppointments as AppointmentWithRelations[]}
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
          <Dialog open={openEdit} onOpenChange={setOpenEdit}>
            <DialogTrigger asChild>
              {/* This trigger is already handled in ActionButtons */}
            </DialogTrigger>
            <AppointmentEditForm appointment={selectedAppointment} open={openEdit} setOpen={setOpenEdit} />
          </Dialog>
        </>
      )}

      {/* Customer Details Dialog */}
      <Dialog open={showCustomerDetails} onOpenChange={setShowCustomerDetails}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold">Contact Information</h3>
                  <div className="space-y-2 mt-2">
                    <p><span className="text-muted-foreground">Name:</span> {selectedCustomer.firstName} {selectedCustomer.lastName}</p>
                    <p><span className="text-muted-foreground">Email:</span> {selectedCustomer.email}</p>
                    <p><span className="text-muted-foreground">Phone:</span> {selectedCustomer.phone}</p>
                    <p><span className="text-muted-foreground">Address:</span> {selectedCustomer.address || 'Not specified'}</p>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold">Additional Information</h3>
                  <div className="space-y-2 mt-2">
                    <p><span className="text-muted-foreground">Gender:</span> {selectedCustomer.gender || 'Not specified'}</p>
                    <p><span className="text-muted-foreground">Pets:</span> {selectedCustomer.petCount || 0}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}