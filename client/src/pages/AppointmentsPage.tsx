import { useState } from "react";
import { useAppointments } from "@/hooks/use-appointments";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Dialog } from "@/components/ui/dialog";
import AppointmentForm from "@/components/AppointmentForm";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { type Appointment } from "@/lib/schema";

type AppointmentStatus = "pending" | "confirmed" | "completed" | "cancelled";

const statusColorMap: Record<AppointmentStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function AppointmentsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { data: appointments, isLoading } = useAppointments();

  const columns = [
    {
      header: "Date",
      cell: (row: Appointment) => format(new Date(row.date), "PPp"),
    },
    {
      header: "Pet",
      cell: (row: Appointment) => row.pet.name,
    },
    {
      header: "Customer",
      cell: (row: Appointment) => `${row.pet.customer.firstName} ${row.pet.customer.lastName}`,
    },
    {
      header: "Groomer",
      cell: (row: Appointment) => row.groomer.name,
    },
    {
      header: "Service",
      cell: (row: Appointment) => row.service.name,
    },
    {
      header: "Status",
      cell: (row: Appointment) => (
        <Badge className={statusColorMap[row.status as AppointmentStatus]}>
          {row.status}
        </Badge>
      ),
    },
    {
      header: "Price",
      cell: (row: Appointment) =>
        new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(row.service.price),
    },
  ];

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Appointments</h1>
        <Button onClick={() => setIsDialogOpen(true)}>
          Schedule Appointment
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AppointmentForm />
      </Dialog>

      <DataTable
        columns={columns}
        data={appointments || []}
        isLoading={isLoading}
      />
    </div>
  );
}
