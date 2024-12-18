import { useState } from "react";
import { Plus, Users } from "lucide-react";
import { useStaff } from "@/hooks/use-staff";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema, type InsertUser, type User } from "@/lib/user-types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function StaffPage() {
  const { staffMembers, isLoading, addStaffMember, updateStaffMember, deleteStaffMember } = useStaff();
  const [showStaffDialog, setShowStaffDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<User | null>(null);
  const { toast } = useToast();

  const form = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      role: "staff",
      isGroomer: false,
      specialties: [],
      petTypePreferences: [],
      experienceYears: 0,
      maxDailyAppointments: 8,
      isActive: true
    },
  });

  const onSubmit = async (data: InsertUser) => {
    try {
      // Always ensure isGroomer is set based on role and include all required fields
      const role = data.role === 'groomer' ? 'groomer' as const : 'staff' as const;
      const staffData = {
        ...data,
        isGroomer: role === 'groomer',
        isActive: true,
        specialties: data.specialties || [],
        petTypePreferences: data.petTypePreferences || [],
        experienceYears: data.experienceYears || 0,
        maxDailyAppointments: data.maxDailyAppointments || 8,
        role
      };

      console.log('Submitting staff data:', staffData);

      if (selectedStaff) {
        // Update existing staff member
        await updateStaffMember({
          id: selectedStaff.id,
          data: staffData
        });

        // Update role in Firebase Auth if email changed
        if (selectedStaff.email !== data.email) {
          const response = await fetch(`/api/users/update-role`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: data.email,
              role: role,
              name: data.name
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to update user role in Firebase Auth');
          }
        }

        toast({
          title: "Success",
          description: "Staff member updated successfully",
        });
      } else {
        // Create new staff member in Firebase Auth first
        const response = await fetch(`/api/users/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: data.email,
            role: role,
            name: data.name,
            password: Math.random().toString(36).slice(-8) // Generate random initial password
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create user in Firebase Auth');
        }

        const { uid } = await response.json();
        
        // Add staff member to Firestore with Firebase UID
        await addStaffMember({
          ...staffData,
          firebaseUid: uid,
          role: role,
          isActive: true
        });

        toast({
          title: "Success",
          description: "Staff member added successfully. A welcome email has been sent with login instructions.",
        });
      }
      
      setShowStaffDialog(false);
      form.reset();
      setSelectedStaff(null);
    } catch (error) {
      console.error('Error saving staff:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save staff member",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (staff: User) => {
    setSelectedStaff(staff);
    form.reset({
      name: staff.name,
      email: staff.email,
      phone: staff.phone,
      role: staff.role,
      isGroomer: staff.isGroomer,
      specialties: staff.specialties || [],
      petTypePreferences: staff.petTypePreferences || [],
      experienceYears: staff.experienceYears || 0,
      maxDailyAppointments: staff.maxDailyAppointments || 8,
      isActive: staff.isActive
    });
    setShowStaffDialog(true);
  };

  const handleDelete = (staff: User) => {
    setSelectedStaff(staff);
    setShowDeleteConfirm(true);
  };

  const columns = [
    {
      header: "Name",
      cell: (staff: User) => staff.name,
    },
    {
      header: "Role",
      cell: (staff: User) => staff.role,
    },
    {
      header: "Email",
      cell: (staff: User) => staff.email,
    },
    {
      header: "Phone",
      cell: (staff: User) => staff.phone,
    },
    {
      header: "Active",
      cell: (staff: User) => (
        <Switch
          checked={staff.isActive}
          onCheckedChange={async (checked) => {
            await updateStaffMember({
              id: staff.id,
              data: { isActive: checked }
            });
          }}
        />
      ),
    },
    {
      header: "Actions",
      cell: (staff: User) => (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleEdit(staff)}>
            Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleDelete(staff)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="container mx-auto max-w-7xl space-y-6 px-6">
      <div className="relative h-48 rounded-xl overflow-hidden mb-6">
        <img
          src="https://images.unsplash.com/photo-1587560699334-cc4ff634909a"
          alt="Staff Management"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-transparent flex items-center p-8">
          <div className="text-white">
            <h2 className="text-2xl font-bold">Staff Management</h2>
            <p>Manage your groomers and staff members</p>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <Button
          onClick={() => {
            setSelectedStaff(null);
            form.reset({
              name: "",
              email: "",
              phone: "",
              role: "staff",
              isGroomer: false,
              specialties: [],
              petTypePreferences: [],
              experienceYears: 0,
              maxDailyAppointments: 8,
              isActive: true
            });
            setShowStaffDialog(true);
          }}
          className="h-12 px-6"
        >
          <Plus className="mr-2 h-5 w-5" />
          Add Staff Member
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column, index) => (
                <TableHead key={index}>{column.header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {staffMembers.map((staff) => (
              <TableRow key={staff.id}>
                {columns.map((column, index) => (
                  <TableCell key={index}>{column.cell(staff)}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showStaffDialog} onOpenChange={setShowStaffDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedStaff ? "Edit Staff Member" : "Add Staff Member"}
            </DialogTitle>
            <DialogDescription>
              Enter the staff member details below
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Staff member name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="Email address" type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="Phone number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        // Update isGroomer when role changes
                        form.setValue('isGroomer', value === 'groomer');
                      }} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="staff">Staff Member</SelectItem>
                        <SelectItem value="groomer">Pet Groomer</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxDailyAppointments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Daily Appointments</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="20"
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
                    setShowStaffDialog(false);
                    form.reset();
                    setSelectedStaff(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {selectedStaff ? "Update Staff" : "Add Staff"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the staff
              member and remove all their data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (selectedStaff) {
                  try {
                    await deleteStaffMember(selectedStaff.id);
                    toast({
                      title: "Success",
                      description: "Staff member deleted successfully",
                    });
                  } catch (error) {
                    toast({
                      title: "Error",
                      description: "Failed to delete staff member",
                      variant: "destructive",
                    });
                  }
                }
                setShowDeleteConfirm(false);
                setSelectedStaff(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
