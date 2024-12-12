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

// Move this file to correct path: /settings/working-hours
export default function WorkingHoursSettingsPage() {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
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
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {daysOfWeek.map((day, index) => {
          const daySchedule = workingHours?.find(
            (schedule) => schedule.dayOfWeek === index
          );

          return (
            <Card key={day}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-xl">{day}</CardTitle>
                  <CardDescription>
                    {daySchedule?.isOpen
                      ? `Open: ${daySchedule.openingTime} - ${daySchedule.closingTime}`
                      : "Closed"}
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedDay(index)}
                >
                  Edit
                </Button>
              </CardHeader>
              <CardContent>
                {daySchedule?.isOpen ? (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-500">
                      Break Time:{" "}
                      {daySchedule.breakStart && daySchedule.breakEnd
                        ? `${daySchedule.breakStart} - ${daySchedule.breakEnd}`
                        : "--:-- - --:--"}
                    </p>
                    <p className="text-sm text-gray-500">
                      Max Daily Appointments: {daySchedule.maxDailyAppointments}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">
                    Click edit to set working hours
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <WorkingHoursForm
        open={selectedDay !== null}
        onOpenChange={(open) => !open && setSelectedDay(null)}
        defaultDay={selectedDay}
        existingSchedule={selectedDay !== null ? workingHours?.find(
          (schedule) => schedule.dayOfWeek === selectedDay
        ) : undefined}
      />
    </div>
  );
}
