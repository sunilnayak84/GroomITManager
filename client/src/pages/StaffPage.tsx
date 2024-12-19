import { useState } from "react";
import { RoleTypes } from "@/lib/role-types";
import { Plus } from "lucide-react";
import { useStaffManagement } from "@/hooks/use-staff-management";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { staffSchema, type Staff, type InsertStaff } from "@/lib/staff-types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox"; // Import Checkbox component
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

// Assuming RoleTypes enum is defined elsewhere, e.g., in firebase.ts
// enum RoleTypes {
//   admin = 'admin',
//   customer = 'customer',
//   staff = 'staff',
//   manager = 'manager',
//   receptionist = 'receptionist',
//   groomer = 'groomer',
//   vet = 'vet',
//   trainer = 'trainer',
//   boarder = 'boarder',
//   walker = 'walker'
// }

const STAFF_ROLES = Object.values(RoleTypes).filter(role => role !== 'admin' && role !== 'customer');
const STAFF_SPECIALTIES = ['groomer', 'walker', 'vet', 'boarder', 'trainer'];


export default function StaffPage() {
  const { 
    staffMembers, 
    isLoading, 
    addStaff, 
    updateStaff, 
    deactivateStaff 
  } = useStaffManagement();
  const [showStaffDialog, setShowStaffDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);

  const form = useForm<InsertStaff>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      role: "staff",
      isActive: true,
      maxDailyAppointments: 8,
      branchId: null,
      specialties: [] // Add default value for specialties
    }
  });

  const onSubmit = async (data: InsertStaff) => {
    try {
      if (selectedStaff) {
        await updateStaff({
          id: selectedStaff.id,
          ...data
        });
      } else {
        await addStaff(data);
      }
      setShowStaffDialog(false);
      form.reset();
      setSelectedStaff(null);
    } catch (error) {
      console.error('Error saving staff:', error);
    }
  };

  const handleEdit = (staff: Staff) => {
    setSelectedStaff(staff);
    form.reset({
      name: staff.name,
      email: staff.email,
      phone: staff.phone,
      role: staff.role,
      isActive: staff.isActive,
      maxDailyAppointments: staff.maxDailyAppointments,
      branchId: staff.branchId,
      specialties: staff.specialties || [] // Include specialties in reset
    });
    setShowStaffDialog(true);
  };

  const columns = [
    { header: "Name", cell: (staff: Staff) => staff.name },
    { header: "Role", cell: (staff: Staff) => staff.role },
    { header: "Email", cell: (staff: Staff) => staff.email },
    { header: "Phone", cell: (staff: Staff) => staff.phone || "N/A" },
    { header: "Specialties", cell: (staff: Staff) => staff.specialties.join(', ') || 'N/A' }, //Added Specialties column
    {
      header: "Active",
      cell: (staff: Staff) => (
        <Switch
          checked={staff.isActive}
          onCheckedChange={async (checked) => {
            await updateStaff({
              id: staff.id,
              isActive: checked
            });
          }}
        />
      )
    },
    {
      header: "Actions",
      cell: (staff: Staff) => (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleEdit(staff)}>
            Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              setSelectedStaff(staff);
              setShowDeleteConfirm(true);
            }}
          >
            Delete
          </Button>
        </div>
      )
    }
  ];

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Staff Management</h1>
        <Button
          onClick={() => {
            setSelectedStaff(null);
            form.reset();
            setShowStaffDialog(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Staff
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
            {staffMembers.map((staff: Staff) => (
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
                      <Input {...field} />
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
                      <Input type="email" {...field} />
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
                      <Input {...field} />
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {STAFF_ROLES.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role.charAt(0).toUpperCase() + role.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="specialties"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Specialties</FormLabel>
                    <FormControl>
                      <div className="flex flex-wrap gap-2">
                        {STAFF_SPECIALTIES.map((specialty) => (
                          <label key={specialty} className="flex items-center space-x-2">
                            <Checkbox
                              checked={field.value?.includes(specialty)}
                              onCheckedChange={(checked) => {
                                const newValue = checked
                                  ? [...(field.value || []), specialty]
                                  : field.value?.filter((s) => s !== specialty) || [];
                                field.onChange(newValue);
                              }}
                            />
                            <span>{specialty.charAt(0).toUpperCase() + specialty.slice(1)}</span>
                          </label>
                        ))}
                      </div>
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
                  {selectedStaff ? "Update" : "Add"}
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
              This will deactivate the staff member's account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (selectedStaff?.id) {
                  await deactivateStaff(selectedStaff.id);
                }
                setShowDeleteConfirm(false);
                setSelectedStaff(null);
              }}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}