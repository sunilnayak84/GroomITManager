
import { useUser } from "@/hooks/use-user";
import { useAppointments } from "@/hooks/use-appointments";
import { usePets } from "@/hooks/use-pets";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { PlusCircle } from "lucide-react";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import AppointmentForm from "@/components/AppointmentForm";

export default function CustomerDashboardPage() {
  const { user } = useUser();
  const { data: appointments } = useAppointments();
  const { pets } = usePets();

  const customerAppointments = appointments?.filter(
    (appointment) => appointment.pet.owner?.email === user?.email
  );

  const customerPets = pets.filter(
    (pet) => pet.owner?.email === user?.email
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Welcome, {user?.name}</h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <PlusCircle className="h-4 w-4" />
              Book Appointment
            </Button>
          </DialogTrigger>
          <AppointmentForm setOpen={(open) => {}} />
        </Dialog>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Your Pets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {customerPets.map((pet) => (
                <div key={pet.id} className="flex items-center gap-4 p-4 border rounded-lg">
                  <img
                    src={pet.image || `https://api.dicebear.com/7.x/adventurer/svg?seed=${pet.name}`}
                    alt={pet.name}
                    className="w-12 h-12 rounded-full"
                  />
                  <div>
                    <div className="font-medium">{pet.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {pet.breed} · {pet.type}
                    </div>
                  </div>
                </div>
              ))}
              {customerPets.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  No pets registered yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {customerAppointments?.map((appointment) => (
                <div key={appointment.id} className="flex items-center gap-4 p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">
                      {format(new Date(appointment.date), 'PPP')}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {appointment.pet.name} · {appointment.service[0]?.name}
                      {appointment.notes && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          <span className="font-medium">Recommendations: </span>
                          {appointment.notes}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-sm font-medium">
                    {format(new Date(appointment.date), 'p')}
                  </div>
                </div>
              ))}
              {!customerAppointments?.length && (
                <div className="text-center text-muted-foreground py-8">
                  No upcoming appointments
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
