import { useState } from "react";
import { useWalks } from "@/hooks/use-walks";
import { useStaff } from "@/hooks/use-staff";
import { useCustomers } from "@/hooks/use-customers";
import { usePets } from "@/hooks/use-pets";
import type { WalkSession, InsertWalkSession } from "@/lib/walking-types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertWalkSessionSchema } from "@/lib/walking-types";
import { Loader2 } from "lucide-react";

export default function DogWalkingPage() {
  const { toast } = useToast();
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { useWalkSessions, addWalkSession } = useWalks();
  const { staffMembers } = useStaff();
  const { pets } = usePets();
  const { customers } = useCustomers();

  // Get all walk sessions
  const { data: walkSessions = [], isLoading } = useWalkSessions();

  // Filter staff members to get only walkers
  const walkers = staffMembers?.filter(staff => staff.role === 'pet_walker') ?? [];

  const form = useForm<InsertWalkSession>({
    resolver: zodResolver(insertWalkSessionSchema),
    defaultValues: {
      petId: "",
      walkerId: "",
      scheduledStartTime: "",
      duration: 30,
      status: "scheduled" as const,
    },
  });

  const onSubmit = async (data: InsertWalkSession) => {
    try {
      setIsSubmitting(true);
      console.log("Form submitted with data:", data);

      // Get the pet's customer ID
      const pet = pets?.find(p => p.id === data.petId);
      if (!pet) {
        throw new Error("Selected pet not found");
      }

      // Calculate end time based on start time and duration
      const startTime = new Date(data.scheduledStartTime);
      const endTime = new Date(startTime.getTime() + data.duration * 60000);

      const walkData = {
        ...data,
        customerId: pet.customerId,
        scheduledEndTime: endTime.toISOString(),
        scheduledStartTime: startTime.toISOString(),
        status: "scheduled" as const,
      };

      console.log("Submitting walk data:", walkData);
      const walkId = await addWalkSession(walkData);
      console.log("Walk scheduled successfully with ID:", walkId);

      toast({
        title: "Success",
        description: "Walk scheduled successfully",
      });
      setShowScheduleDialog(false);
      form.reset();
    } catch (error) {
      console.error("Error scheduling walk:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to schedule walk",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto max-w-7xl space-y-6 px-6">
      <div className="flex justify-between items-center mb-6">
        <Button
          onClick={() => {
            form.reset();
            setShowScheduleDialog(true);
          }}
          className="h-12 px-6"
        >
          Schedule Walk
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pet</TableHead>
              <TableHead>Walker</TableHead>
              <TableHead>Start Time</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {walkSessions.map((session: WalkSession) => {
              const pet = pets?.find(p => p.id === session.petId);
              const walker = walkers?.find(w => w.id === session.walkerId);

              return (
                <TableRow key={session.id}>
                  <TableCell>{pet?.name ?? session.petId}</TableCell>
                  <TableCell>{walker?.name ?? session.walkerId}</TableCell>
                  <TableCell>{new Date(session.scheduledStartTime).toLocaleString()}</TableCell>
                  <TableCell>{session.duration} minutes</TableCell>
                  <TableCell>{session.status}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule a Walk</DialogTitle>
            <DialogDescription>
              Enter the walk details below
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="petId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pet</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select pet" />
                        </SelectTrigger>
                        <SelectContent>
                          {pets?.map((pet) => (
                            <SelectItem key={pet.id} value={pet.id}>
                              {pet.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="walkerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Walker</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select walker" />
                        </SelectTrigger>
                        <SelectContent>
                          {walkers?.map((walker) => (
                            <SelectItem key={walker.id} value={walker.id}>
                              {walker.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="scheduledStartTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <FormControl>
                      <Input 
                        type="datetime-local" 
                        {...field} 
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (minutes)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="15"
                        max="120"
                        step="15"
                        {...field}
                        disabled={isSubmitting}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowScheduleDialog(false);
                    form.reset();
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Scheduling...
                    </>
                  ) : (
                    'Schedule Walk'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}