import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useAppointments } from "../hooks/use-appointments";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import AppointmentForm from "../components/AppointmentForm";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import type { Appointment } from "@db/schema";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  "in-progress": "bg-blue-100 text-blue-800",
};

type AppointmentStatus = 'pending' | 'completed' | 'cancelled' | 'in-progress';

type AppointmentWithRelations = Appointment & {
  pet: { name: string; breed: string; image: string | null };
  customer: { name: string };
  groomer: { name: string };
};

export default function AppointmentsPage() {
  const [open, setOpen] = useState(false);
  const { data: appointments, isLoading } = useAppointments();

  const columns = [
    {
      header: "Date",
      cell: (row: AppointmentWithRelations) => format(new Date(row.date), "PPp"),
    },
    {
      header: "Pet",
      cell: (row: AppointmentWithRelations) => (
        <div className="flex items-center gap-2">
          <img
            src={row.pet.image || `https://api.dicebear.com/7.x/adventurer/svg?seed=${row.pet.name}`}
            alt={row.pet.name}
            className="w-8 h-8 rounded-full"
          />
          <div>
            <div className="font-medium">{row.pet.name}</div>
            <div className="text-sm text-muted-foreground">{row.pet.breed}</div>
          </div>
        </div>
      ),
    },
    {
      header: "Customer",
      cell: (row: AppointmentWithRelations) => row.customer.name,
    },
    {
      header: "Groomer",
      cell: (row: AppointmentWithRelations) => row.groomer.name,
    },
    {
      header: "Status",
      cell: (row: AppointmentWithRelations) => {
        const status = row.status.toLowerCase();
        return (
          <Badge className={statusColors[status] || statusColors['pending']}>
            {row.status}
          </Badge>
        );
      },
    },
    {
      header: "Actions",
      cell: (row: AppointmentWithRelations) => (
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          View
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Appointments</h1>
          <p className="text-muted-foreground">Manage your appointments</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Appointment
            </Button>
          </DialogTrigger>
          <AppointmentForm />
        </Dialog>
      </div>

      <div className="rounded-xl overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1727681200732-0086492c217d"
          alt="Pet Grooming"
          className="w-full h-48 object-cover"
        />
      </div>

      <DataTable
        columns={columns}
        data={appointments || []}
        isLoading={isLoading}
      />
    </div>
  );
}
