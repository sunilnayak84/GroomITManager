
import { useState } from "react";
import { useStaff } from "@/hooks/use-staff";
import StaffAvailabilityForm from "@/components/StaffAvailabilityForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function StaffAvailabilityPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const { staffMembers, isLoading } = useStaff();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Staff Availability</h1>
      </div>

      <div className="grid gap-4">
        {staffMembers.map((staff) => (
          <Card key={staff.id}>
            <CardHeader>
              <CardTitle>{staff.name}</CardTitle>
              <CardDescription>Schedule availability for {staff.name}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => {
                  setSelectedStaffId(staff.id);
                  setIsFormOpen(true);
                }}
              >
                Configure Availability
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedStaffId && (
        <StaffAvailabilityForm
          staffId={selectedStaffId}
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
        />
      )}
    </div>
  );
}
