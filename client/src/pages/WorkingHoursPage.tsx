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
  const [isFormOpen, setIsFormOpen] = useState(false);
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
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const handleEditDay = (dayIndex: number) => {
    setSelectedDay(dayIndex);
    setIsFormOpen(true);
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Working Hours</h1>
        <Button onClick={() => {
          setSelectedDay(null);
          setIsFormOpen(true);
        }}>
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
            <Card key={day} className="relative">
              <Button
                variant="ghost"
                className="absolute top-2 right-2"
                onClick={() => handleEditDay(index)}
              >
                Edit
              </Button>
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
        defaultDay={selectedDay}
        existingSchedule={selectedDay !== null ? workingHours?.find(
          (schedule) => schedule.dayOfWeek === selectedDay
        ) : undefined}
      />
    </div>
  );
}
