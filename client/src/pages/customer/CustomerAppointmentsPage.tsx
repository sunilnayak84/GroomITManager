
import { useAppointments } from "@/hooks/use-appointments";
import { useUser } from "@/hooks/use-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import AppointmentForm from "@/components/AppointmentForm";

export default function CustomerAppointmentsPage() {
  const { user } = useUser();
  const { data: appointments } = useAppointments();
  
  const customerAppointments = appointments
    ?.filter((appointment) => appointment.pet.owner?.email === user?.email)
    ?.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">My Appointments</h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Book Appointment
            </Button>
          </DialogTrigger>
          <AppointmentForm setOpen={(open) => {}} />
        </Dialog>
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
              <p>Services: {appointment.service?.map(s => s.name).join(', ') || 'No services'}</p>
              <p>Status: {appointment.status}</p>
              {appointment.notes && (
                <div className="mt-2 pt-2 border-t border-primary/20">
                  <p className="font-medium text-primary">Recommendations:</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap mt-1">{appointment.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
