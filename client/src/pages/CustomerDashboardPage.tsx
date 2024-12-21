
import { useUser } from "@/hooks/use-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, Dog } from "lucide-react";
import { Link } from "wouter";

export default function CustomerDashboardPage() {
  const { user } = useUser();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Welcome, {user?.email}</h1>
      
      <div className="grid md:grid-cols-2 gap-4">
        <Link href="/customer/appointments">
          <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Appointments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>View and manage your appointments</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/customer/pets">
          <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Dog className="h-5 w-5" />
                My Pets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>View and manage your pets</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
