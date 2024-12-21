
import { useAppointments } from "@/hooks/use-appointments";
import { useUser } from "@/hooks/use-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";

export default function CustomerAppointmentsPage() {
  const { user } = useUser();
  const { data: appointments } = useAppointments();
  
  const customerAppointments = appointments?.filter(
    (appointment) => appointment.customerId === user?.uid
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">My Appointments</h1>
        <Link href="/customer/appointments/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Book Appointment
          </Button>
        </Link>
      </div>

      <div className="grid gap-4">
        {customerAppointments?.map((appointment) => (
          <Card key={appointment.id}>
            <CardHeader>
              <CardTitle>
                {format(new Date(appointment.date), 'PPP')} at {format(new Date(appointment.date), 'p')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>Pet: {appointment.pet.name}</p>
              <p>Services: {appointment.services.join(', ')}</p>
              <p>Status: {appointment.status}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
