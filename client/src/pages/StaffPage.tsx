import { useState } from "react";
import { Plus, Scissors, Users, BadgeCheck, X } from "lucide-react";
import { useStaffManagement } from "@/hooks/use-staff-management";
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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  staffSchema,
  type Staff,
  type InsertStaff,
  GROOMER_SPECIALTIES,
  PET_TYPE_PREFERENCES,
  getSpecialtyLabel,
  getPetTypeLabel,
  type GroomerSpecialty,
  type PetTypePreference
} from "@/lib/staff-types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
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
import { getAuth } from "firebase/auth";

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
  const { toast } = useToast();

  const form = useForm<InsertStaff>({
    resolver: zodResolver(staffSchema),
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
      isActive: true,
      primaryBranchId: null,
      isMultiBranchEnabled: false,
      managedBranchIds: [],
      branchId: null
    },
  });

  const onSubmit = async (data: InsertStaff) => {
    try {
      console.log('Submitting staff data:', data);
      
      if (selectedStaff) {
        await updateStaff({
          id: selectedStaff.id,
          ...data
        });
        
        toast({
          title: "Success",
          description: "Staff member updated successfully",
        });
      } else {
        // For new staff creation
        const newStaffData = {
          ...data,
          isGroomer: data.role === 'groomer',
          maxDailyAppointments: data.maxDailyAppointments || 8,
          isActive: true,
          specialties: data.role === 'groomer' ? data.specialties || [] : [],
          petTypePreferences: data.role === 'groomer' ? data.petTypePreferences || [] : [],
          experienceYears: data.role === 'groomer' ? data.experienceYears || 0 : 0,
          branchId: data.primaryBranchId || null,
        };

        console.log('Creating new staff with data:', newStaffData);
        const result = await addStaff(newStaffData);
        console.log('Staff creation result:', result);

        toast({
          title: "Success",
          description: "Staff member added successfully",
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

  const handleEdit = (staff: Staff) => {
    setSelectedStaff(staff);
    form.reset({
      name: staff.name,
      email: staff.email,
      phone: staff.phone || "",
      role: staff.role,
      isGroomer: staff.isGroomer,
      specialties: staff.specialties || [],
      petTypePreferences: staff.petTypePreferences || [],
      experienceYears: staff.experienceYears || 0,
      maxDailyAppointments: staff.maxDailyAppointments || 8,
      isActive: staff.isActive,
      primaryBranchId: staff.primaryBranchId,
      isMultiBranchEnabled: staff.isMultiBranchEnabled,
      managedBranchIds: staff.managedBranchIds,
      branchId: staff.branchId
    });
    setShowStaffDialog(true);
  };

  const handleDelete = (staff: Staff) => {
    setSelectedStaff(staff);
    setShowDeleteConfirm(true);
  };

  const columns = [
    {
      header: "Name",
      cell: (staff: Staff) => staff.name,
    },
    {
      header: "Role",
      cell: (staff: Staff) => (
        <div className="flex items-center gap-2">
          {staff.role === 'groomer' ? (
            <div className="flex items-center gap-1">
              <Scissors className="h-4 w-4" />
              <span>Groomer</span>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>Staff</span>
            </div>
          )}
        </div>
      ),
    },
    {
      header: "Email",
      cell: (staff: Staff) => staff.email,
    },
    {
      header: "Phone",
      cell: (staff: Staff) => staff.phone || "N/A",
    },
    {
      header: "Specialties",
      cell: (staff: Staff) => staff.isGroomer ? (
        <div className="flex flex-wrap gap-1">
          {staff.specialties.slice(0, 3).map((specialty) => (
            <Badge key={specialty} variant="secondary" className="text-xs">
              {getSpecialtyLabel(specialty)}
            </Badge>
          ))}
          {staff.specialties.length > 3 && (
            <Badge variant="secondary" className="text-xs">
              +{staff.specialties.length - 3} more
            </Badge>
          )}
        </div>
      ) : (
        "N/A"
      ),
    },
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
      ),
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
        <DialogContent onInteractOutside={(e) => e.preventDefault()}>
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
                        <SelectItem value="walker">Pet Walker</SelectItem>
                        <SelectItem value="trainer">Pet Trainer</SelectItem>
                        <SelectItem value="vet">Veterinarian</SelectItem>
                        <SelectItem value="boarder">Pet Boarder</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="receptionist">Receptionist</SelectItem>
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

              <FormField
                control={form.control}
                name="primaryBranchId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary Branch</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value || undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select primary branch" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="branch1">Main Branch</SelectItem>
                        <SelectItem value="branch2">Downtown Branch</SelectItem>
                        <SelectItem value="branch3">North Branch</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isMultiBranchEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Multi-Branch Access</FormLabel>
                      <FormDescription>
                        Allow this staff member to work across multiple branches
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="managedBranchIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Managed Branches</FormLabel>
                    <FormDescription>
                      Select additional branches this staff member can work at
                    </FormDescription>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {['branch1', 'branch2', 'branch3'].map((branchId) => (
                        <Badge
                          key={branchId}
                          variant={field.value?.includes(branchId) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => {
                            const currentValue = field.value || [];
                            field.onChange(
                              currentValue.includes(branchId)
                                ? currentValue.filter(id => id !== branchId)
                                : [...currentValue, branchId]
                            );
                          }}
                        >
                          {branchId === 'branch1' ? 'Main Branch' :
                           branchId === 'branch2' ? 'Downtown Branch' : 'North Branch'}
                        </Badge>
                      ))}
                    </div>
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
                if (selectedStaff?.id) {
                  try {
                    await deactivateStaff(selectedStaff.id);
                    toast({
                      title: "Success",
                      description: "Staff member deactivated successfully",
                    });
                  } catch (error) {
                    toast({
                      title: "Error",
                      description: "Failed to deactivate staff member",
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