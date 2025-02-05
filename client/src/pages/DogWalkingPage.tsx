import { useState } from "react";
import { useWalks } from "@/hooks/use-walks";
import { useStaff } from "@/hooks/use-staff";
import { useCustomers } from "@/hooks/use-customers";
import type { WalkSession } from "@/lib/walking-types";
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
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertWalkSessionSchema } from "@/lib/walking-types";

export default function DogWalkingPage() {
  const { toast } = useToast();
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const { useWalkSessions, addWalkSession } = useWalks();
  const { staffMembers } = useStaff();
  const { customers } = useCustomers();

  // Get all walk sessions
  const { data: walkSessions = [], isLoading } = useWalkSessions();

  const form = useForm({
    resolver: zodResolver(insertWalkSessionSchema),
    defaultValues: {
      petId: "",
      walkerId: "",
      scheduledStartTime: "",
      scheduledEndTime: "",
      duration: 30,
      status: "scheduled" as const,
      recurring: false,
    },
  });

  const onSubmit = async (data: any) => {
    try {
      await addWalkSession(data);
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
        description: "Failed to schedule walk",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto max-w-7xl space-y-6 px-6">
      <div className="relative h-48 rounded-xl overflow-hidden mb-6">
        <img
          src="https://images.unsplash.com/photo-1601758174114-e711c0cbaa69"
          alt="Dog Walking"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-transparent flex items-center p-8">
          <div className="text-white">
            <h2 className="text-2xl font-bold">Dog Walking Service</h2>
            <p>Schedule and manage dog walking sessions</p>
          </div>
        </div>
      </div>

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
            {walkSessions.map((session: WalkSession) => (
              <TableRow key={session.id}>
                <TableCell>{session.petId}</TableCell>
                <TableCell>{session.walkerId}</TableCell>
                <TableCell>{session.scheduledStartTime}</TableCell>
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
            ))}
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
                      <Input {...field} placeholder="Select pet" />
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
                      <Input {...field} placeholder="Select walker" />
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
                      <Input type="datetime-local" {...field} />
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
                >
                  Cancel
                </Button>
                <Button type="submit">Schedule Walk</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
