import { useState, useMemo, useEffect } from "react";
import { doc, getDoc } from 'firebase/firestore';
import { petsCollection } from "@/lib/firestore";
import { db, getAuth, auth } from "@/lib/firebase";
import { parseFirestorePet } from "@/hooks/use-pets";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, List, Trash2, Pencil, ExternalLink, CreditCard } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";
import { useAppointments } from "../hooks/use-appointments";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import AppointmentForm from "../components/AppointmentForm";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { z } from "zod";
import { appointmentSchema, type Appointment, type AppointmentWithRelations } from "@/lib/schema";
import AppointmentDetails from "../components/AppointmentDetails";
import AppointmentCalendar from "../components/AppointmentCalendar";
import AppointmentEditForm from "../components/AppointmentEditForm";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PetDetails } from "../components/PetDetails";
import { Link, useLocation as useReactRouterLocation } from "react-router-dom";
import { useLocation } from 'wouter';


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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDeleteClick = () => setShowDeleteDialog(true);

  const handleViewClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onView();
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onEdit();
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteAppointment(appointment.id);
      setShowDeleteDialog(false);
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
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleViewClick}
      >
        View
      </Button>
      {user?.role === 'admin' && (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={handleEditClick}
            className="text-primary hover:text-primary"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <DialogContent className="p-4">
              <DialogHeader>
                <DialogTitle>Delete Appointment</DialogTitle>
              </DialogHeader>
              <DialogDescription>
                Are you sure you want to delete this appointment? This action cannot be undone.
              </DialogDescription>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setShowDeleteDialog(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDelete}>
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDeleteClick}
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

const statusColors: Record<AppointmentWithRelations["status"], string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  in_progress: "bg-purple-100 text-purple-800",
};

export default function AppointmentsPage() {
  const { toast } = useToast();
  const [openNewForm, setOpenNewForm] = useState(false);
  const [openDetails, setOpenDetails] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithRelations | null>(null);
  const [selectedPet, setSelectedPet] = useState<any>(null);
  const [showPetDetails, setShowPetDetails] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showCustomerDetails, setShowCustomerDetails] = useState(false);
  const [view, setView] = useState<'list' | 'calendar'>(() => {
    return localStorage.getItem('appointmentView') as 'list' | 'calendar' || 'list'
  });
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'past' | 'all'>(() => {
    return localStorage.getItem('appointmentDateFilter') as 'today' | 'week' | 'month' | 'past' | 'all' || 'all'
  });
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'>(() => {
    return localStorage.getItem('appointmentStatusFilter') as 'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled' || 'all'
  });
  const [isLoading, setIsLoading] = useState(false); // Added loading state
  const [billPreview, setBillPreview] = useState<any>(null);
  const [showBillModal, setShowBillModal] = useState(false);
  const [, navigate] = useLocation(); // Using wouter's useLocation for navigation
  const { data: appointments, isLoading: appointmentsLoading, error, refetch: fetchAppointments } = useAppointments();

  // Add logging when appointments data changes
  useEffect(() => {
    if (appointments && selectedAppointment) {
      // Find the updated version of the selected appointment
      const updatedAppointment = appointments.find(apt => apt.id === selectedAppointment.id);
      if (updatedAppointment && JSON.stringify(updatedAppointment) !== JSON.stringify(selectedAppointment)) {
        console.log('Updating selected appointment with new data:', {
          id: updatedAppointment.id,
          oldImage: selectedAppointment.beforeImage,
          newImage: updatedAppointment.beforeImage,
          timestamp: new Date().toISOString()
        });
        setSelectedAppointment(updatedAppointment);
      }
    }
  }, [appointments, selectedAppointment]);

  useEffect(() => {
    if (appointments) {
      console.log('AppointmentsPage: Appointments data updated:', {
        count: appointments.length,
        appointmentsWithImages: appointments.filter(apt => apt.beforeImage).length,
        timestamp: new Date().toISOString()
      });
    }
  }, [appointments]);

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

  const [sortConfig, setSortConfig] = useState<{
    key: 'date';
    direction: 'asc' | 'desc' | null;
  }>(() => {
    const savedConfig = localStorage.getItem('appointmentSortConfig');
    return savedConfig ? JSON.parse(savedConfig) : { key: 'date', direction: null };
  });

  // Save sort config when it changes
  useEffect(() => {
    localStorage.setItem('appointmentSortConfig', JSON.stringify(sortConfig));
  }, [sortConfig]);

  const sortedAppointments = useMemo(() => {
    if (!filteredAppointments || !sortConfig.direction) return filteredAppointments;

    return [...filteredAppointments].sort((a, b) => {
      const dateA = new Date(a[sortConfig.key]).getTime();
      const dateB = new Date(b[sortConfig.key]).getTime();
      return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
    });
  }, [filteredAppointments, sortConfig]);

  const columns = useMemo(() => [
    {
      header: () => (
        <div
          className="flex items-center cursor-pointer hover:text-primary transition-colors"
          onClick={() => {
            setSortConfig({
              key: 'date',
              direction: sortConfig.direction === 'asc' ? 'desc' : 'asc',
            });
          }}
        >
          <span>Date</span>
          <svg
            className={`w-4 h-4 ml-1 transform transition-transform ${
              sortConfig.direction === 'asc' ? 'rotate-180' : ''
            } ${!sortConfig.direction ? 'opacity-0' : 'opacity-100'}`}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6"/>
          </svg>
        </div>
      ),
      cell: ({ date }: AppointmentWithRelations) => format(new Date(date), "PPp"),
    },
    {
      header: "Pet",
      cell: ({ pet, petId }: AppointmentWithRelations) => (
        <div className="flex items-center gap-2 cursor-pointer" onClick={async () => {
          if (!petId) return;
          const petRef = doc(petsCollection, petId);
          const petDoc = await getDoc(petRef);
          if (petDoc.exists()) {
            const petData = petDoc.data();
            const customerId = petData?.customerId;

            if (!customerId || typeof customerId !== 'string') {
              console.error('Invalid customer ID');
              return;
            }

            // Fetch customer data
            const customerRef = doc(db, 'customers', customerId);
            const customerDoc = await getDoc(customerRef);

            const fullPetData = parseFirestorePet(petDoc.id, petData);

            if (customerDoc.exists()) {
              const customerData = customerDoc.data();
              fullPetData.owner = {
                id: customerDoc.id,
                name: `${customerData.firstName} ${customerData.lastName}`,
                email: customerData.email
              };
            }

            setSelectedPet(fullPetData);
            setShowPetDetails(true);
          }
        }}>
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
        <div className="font-medium cursor-pointer" onClick={async () => {
          const petDoc = await getDoc(doc(db, 'pets', row.petId));
          if (petDoc.exists()) {
            const petData = petDoc.data();
            const customerId = petData.customerId;

            const customerDoc = await getDoc(doc(db, 'customers', customerId));
            if (customerDoc.exists()) {
              const customerData = customerDoc.data();
              setSelectedCustomer({
                id: customerDoc.id,
                ...customerData,
                createdAt: customerData.createdAt,
                updatedAt: customerData.updatedAt
              });
              setShowCustomerDetails(true);
            }
          }
        }}>
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
      cell: ({ row }) => {
        const appointment = row.original;
        // Check if bill is already generated for this appointment
        const billGenerated = appointment.hasBill === true || appointment.billId;

        return (
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedAppointment(appointment);
                setOpenDetails(true);
              }}
            >
              Details
            </Button>

            {billGenerated ? (
              <Button
                variant="outline"
                size="sm"
                className="bg-green-50 text-green-600 border-green-200 hover:bg-green-100 hover:text-green-700"
                onClick={() => navigate(`/billing/${appointment.billId}`)}
              >
                View Bill
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm" 
                onClick={() => handleGenerateBill(appointment.id)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <span className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-b-transparent"></span>
                    Processing
                  </span>
                ) : (
                  "Generate Bill"
                )}
              </Button>
            )}
          </div>
        );
      },
    },
    {
      id: 'billing',
      header: 'Billing',
      cell: (appointment: AppointmentWithRelations) => {
        return (
          <>
            {appointment.billId ? (
              <>
                <Button variant="outline" size="sm" onClick={() => navigate(`/billing/${appointment.billId}`)}>
                  View Bill
                </Button>
                <span className="ml-2">{appointment.paymentStatus || 'Pending'}</span>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => handleGenerateBill(appointment.id)}>
                Generate Bill
              </Button>
            )}
          </>
        );
      }
    }
  ], []);

  const handleGenerateBill = async (appointmentId: string) => {
    try {
      console.log('[BILLING] Initiating bill generation for:', appointmentId);
      setIsLoading(true);

      const user = auth.currentUser;
      if (!user) {
        console.error("[BILLING] No authenticated user");
        throw new Error("Authentication required");
      }

      // Debug the appointment first to check customer reference
      const token = await user.getIdToken();
      console.log("[BILLING] Debugging appointment data before bill generation");

      const apiBaseUrl = import.meta.env.VITE_API_URL || '';
      const debugResponse = await fetch(
        `${apiBaseUrl}/api/debug/appointment/${appointmentId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (debugResponse.ok) {
        const debugData = await debugResponse.json();
        console.log("[BILLING] Appointment debug data:", debugData);
      } else {
        console.error("[BILLING] Failed to debug appointment");
      }

      console.log("[BILLING] Authentication token obtained, making request");

      // Make API request to generate bill
      console.log("[BILLING] Using API base URL:", apiBaseUrl);
      const response = await fetch(
        `${apiBaseUrl}/api/billing/generate/${appointmentId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        let errorMessage = `Server returned ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          console.error("[BILLING] Error response:", errorData);
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
          console.error("[BILLING] Failed to parse error response:", parseError);
        }
        throw new Error(errorMessage);
      }

      const bill = await response.json();
      console.log('[BILLING] Bill generated:', bill);

      toast({
        title: "Success",
        description: "Bill generated successfully",
      });

      if (fetchAppointments) {
        await fetchAppointments();
      }

      if (bill.id) {
        // Fetch latest bills before showing modal
        try {
          const response = await fetch('/api/billing/bills');
          if (!response.ok) {
            console.error('Failed to refresh bills after generation');
          }
        } catch (error) {
          console.error('Error refreshing bills:', error);
        }

        // Store bill preview and show modal
        setBillPreview(bill);
        setShowBillModal(true);
      }
    } catch (error) {
      console.log('[BILLING] Error generating bill:', error);
      toast({
        variant: "destructive",
        title: "Bill Generation Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="container mx-auto max-w-7xl space-y-6 px-6">
      <div className="relative h-48 rounded-xl overflow-hidden bg-black/50 mb-6">
        <img
          src="https://images.unsplash.com/photo-1727681200732-0086492c217d"
          alt="Pet Grooming"
          className="w-full h-full object-cover opacity-50"
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
            data={sortedAppointments as AppointmentWithRelations[]}
            isLoading={appointmentsLoading || isLoading} // Combine loading states
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
            <AppointmentEditForm appointment={selectedAppointment} setOpen={setOpenEdit} />
          </Dialog>
        </>
      )}

      {/* Pet Details Dialog */}
      <Dialog open={showPetDetails} onOpenChange={setShowPetDetails}>
        <DialogContent className="sm:max-w-[625px]">
          {selectedPet && (
            <PetDetails
              pet={selectedPet}
              formatDate={(date) => date ? format(new Date(date), 'PPP') : 'Not specified'}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Customer Details Dialog */}
      <Dialog open={showCustomerDetails} onOpenChange={setShowCustomerDetails}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-6 p-6">
              <div className="flex items-start gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-bold">{selectedCustomer.firstName} {selectedCustomer.lastName}</h2>
                  <p className="text-muted-foreground">
                    Customer since {selectedCustomer.createdAt ?
                      format(typeof selectedCustomer.createdAt === 'string' ?
                        new Date(selectedCustomer.createdAt) :
                        selectedCustomer.createdAt.toDate(),
                      'PPP') :
                      'Not available'}
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Contact Information</h3>
                  <div className="space-y-2">
                    <p><span className="text-muted-foreground">Email: </span>{selectedCustomer.email || 'Not specified'}</p>
                    <p><span className="text-muted-foreground">Phone: </span>{selectedCustomer.phone || 'Not specified'}</p>
                    <p><span className="text-muted-foreground">Address: </span>{selectedCustomer.address || 'Not specified'}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Additional Information</h3>
                  <div className="space-y-2">
                    <p><span className="text-muted-foreground">Gender: </span>{selectedCustomer.gender ? selectedCustomer.gender.charAt(0).toUpperCase() + selectedCustomer.gender.slice(1) : 'Not specified'}</p>
                    <p><span className="text-muted-foreground">Pets: </span>{selectedCustomer.petCount || 0} pet(s)</p>
                    <p><span className="text-muted-foreground">Last Updated: </span>
                      {selectedCustomer.updatedAt ?
                        format(typeof selectedCustomer.updatedAt === 'string' ?
                          new Date(selectedCustomer.updatedAt) :
                          selectedCustomer.updatedAt.toDate(),
                        'PPP') :
                        'Never'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bill Preview Modal */}
      <Dialog open={showBillModal} onOpenChange={setShowBillModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-xl">Bill Preview</DialogTitle>
            <DialogDescription>
              Bill generated successfully
            </DialogDescription>
            <DialogClose />
          </DialogHeader>
          {billPreview && (
            <div className="space-y-4">
              {/* Bill Header */}
              <div className="flex justify-between items-center border-b pb-3">
                <div>
                  <h3 className="font-medium">Invoice #{billPreview.id?.slice(0, 8)}</h3>
                  <p className="text-sm text-gray-500">
                    {billPreview.createdAt && new Date(billPreview.createdAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    billPreview.status === 'PENDING_PAYMENT' ? 'bg-amber-100 text-amber-800' :
                    billPreview.status === 'PAID' ? 'bg-green-100 text-green-800' :
                    billPreview.status === 'CANCELED' ? 'bg-gray-100 text-gray-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {billPreview.status}
                  </span>
                </div>
              </div>

              {/* Bill Items */}
              <div className="space-y-2">
                <h3 className="font-medium">Services</h3>
                <div className="border rounded-md overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {billPreview.items?.map((item: any, index: number) => (
                        <tr key={index}>
                          <td className="px-4 py-2 whitespace-nowrap">
                            <div className="text-sm font-medium">{item.serviceName}</div>
                            {item.description && <div className="text-xs text-gray-500">{item.description}</div>}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm">₹{item.price?.toFixed(2)}</td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm">{item.quantity}</td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-right">₹{item.subtotal?.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bill Totals */}
              <div className="space-y-2">
                <div className="flex justify-between border-b pb-2">
                  <span className="font-medium">Subtotal:</span>
                  <span>₹{billPreview.subtotal?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="font-medium">Tax:</span>
                  <span>₹{billPreview.tax?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span>₹{billPreview.totalAmount?.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Link */}
              {billPreview.paymentLink && (
                <div className="border rounded-md p-3 bg-gray-50">
                  <div className="flex items-center text-sm">
                    <CreditCard className="mr-2 h-4 w-4 text-gray-500" />
                    <span>Online Payment:</span>
                    <a 
                      href={billPreview.paymentLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="ml-2 text-blue-600 underline truncate"
                    >
                      {billPreview.paymentLink}
                    </a>
                  </div>
                </div>
              )}

              <DialogFooter className="flex sm:justify-between gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowBillModal(false)}>
                  Close
                </Button>
                <div className="flex gap-2">
                  {billPreview.paymentLink && (
                    <Button onClick={() => window.open(billPreview.paymentLink, '_blank')} className="bg-green-600 hover:bg-green-700">
                      <CreditCard className="mr-2 h-4 w-4" />
                      Pay Now
                    </Button>
                  )}
                  <Button onClick={() => window.open`/billing?billId=${billPreview.id}`, '_blank')}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View Full Bill
                  </Button>
                </div>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}