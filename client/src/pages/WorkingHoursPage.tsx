import { useState } from "react";
import { useWorkingHours } from "../hooks/use-working-hours";
import WorkingHoursForm from "../components/WorkingHoursForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function WorkingHoursPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { data: workingHours, isLoading } = useWorkingHours();

  const daysOfWeek = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  if (isLoading) {
    return <div>Loading working hours...</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Working Hours</h1>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Working Hours
        </Button>
      </div>

      <div className="grid gap-4">
        {daysOfWeek.map((day, index) => {
          const daySchedule = workingHours?.find(
            (schedule) => schedule.dayOfWeek === index
          );

          return (
            <Card key={day}>
              <CardHeader>
                <CardTitle>{day}</CardTitle>
                <CardDescription>
                  {daySchedule?.isOpen
                    ? `Open: ${daySchedule.openingTime} - ${daySchedule.closingTime}`
                    : "Closed"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {daySchedule?.isOpen && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-500">
                      Break Time:{" "}
                      {daySchedule.breakStart && daySchedule.breakEnd
                        ? `${daySchedule.breakStart} - ${daySchedule.breakEnd}`
                        : "No break"}
                    </p>
                    <p className="text-sm text-gray-500">
                      Max Daily Appointments: {daySchedule.maxDailyAppointments}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <WorkingHoursForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
      />
    </div>
  );
}
