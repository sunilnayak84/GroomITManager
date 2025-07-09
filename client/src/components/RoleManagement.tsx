import { useEffect, useState, useMemo, useRef } from "react";
import { useRoles } from '@/hooks/use-roles';
import type { UserRole } from '@/hooks/use-user';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useElementVisibility } from '../hooks/use-element-visibility';
import { ProtectedElement } from './ProtectedElement';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/components/ui/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Schema for role creation/editing
const roleSchema = z.object({
  name: z.string().min(2, 'Role name must be at least 2 characters'),
  permissions: z.array(z.string()),
  description: z.string().optional(),
});

// Schema for user creation
const userSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  displayName: z.string().min(2, 'Display name must be at least 2 characters').optional(),
  role: z.string().min(1, 'Role is required'),
  phoneNumber: z.string().optional(),
});

type RoleFormValues = z.infer<typeof roleSchema>;
type UserFormValues = z.infer<typeof userSchema>;

// Group permissions by category for better organization
const permissionCategories = {
  appointments: [
    'manage_appointments',
    'view_appointments', 
    'create_appointments',
    'cancel_appointments',
    'reschedule_appointments',
    'assign_groomers',
  ],
  customers: [
    'manage_customers',
    'view_customers',
    'create_customers',
    'edit_customer_info',
    'delete_customers',
    'view_customer_history',
  ],
  services: [
    'manage_services',
    'view_services',
    'create_services',
    'edit_services',
    'delete_services',
    'manage_pricing',
  ],
  inventory: [
    'manage_inventory',
    'view_inventory',
    'update_stock',
    'manage_consumables',
    'view_inventory_reports',
    'manage_suppliers',
  ],
  staff: [
    'manage_staff',
    'view_staff',
    'manage_staff_schedule',
    'view_staff_schedule',
    'manage_own_schedule',
    'view_staff_performance',
  ],
  billing: [
    'manage_billing',
    'view_billing',
    'process_payments',
    'view_financial_reports',
    'manage_discounts',
    'generate_invoices',
  ],
  reports: [
    'view_analytics',
    'view_reports',
    'export_reports',
    'view_business_insights',
  ],
  system: [
    'manage_roles',
    'view_roles',
    'manage_settings',
    'view_audit_logs',
    'backup_data',
  ],
};

export function RoleManagement() {
  const { canView } = useElementVisibility();
  const {
    roles,
    isLoadingRoles,
    createRole,
    updateRole,
    isCreating,
    isUpdating,
    users,
    isLoadingUsers,
    updateUserRole,
    isUpdatingUserRole,
    createUser,
    isCreatingUser,
    error
  } = useRoles();

  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  }, [error]);

  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const userFormRef = useRef<HTMLDivElement>(null);

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: '',
      permissions: [],
      description: '',
    },
  });

  const userForm = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      email: '',
      password: '',
      displayName: '',
      role: '',
      phoneNumber: '',
    },
  });

  // Scroll to form when editing
  useEffect(() => {
    if (editingRole && formRef.current) {
      formRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }
  }, [editingRole]);

  const onSubmit = async (data: RoleFormValues) => {
    try {
      console.log('Submitting role data:', data);

      if (editingRole) {
        console.log('Updating existing role:', editingRole);
        await updateRole({
          roleId: editingRole,
          name: editingRole,
          permissions: data.permissions
        });
        toast({
          title: 'Success',
          description: `Role "${editingRole}" updated successfully`,
        });
      } else {
        console.log('Creating new role');
        if (!data.name) {
          toast({
            title: 'Validation Error',
            description: 'Role name is required',
            variant: 'destructive',
          });
          return;
        }
        await createRole({
          name: data.name,
          permissions: data.permissions
        });
        toast({
          title: 'Success',
          description: `Role "${data.name}" created successfully`,
        });
      }

      setEditingRole(null);
      form.reset({
        name: '',
        permissions: [],
        description: '',
      });
    } catch (error) {
      console.error('Error saving role:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save role',
        variant: 'destructive',
      });
    }
  };

  const onUserSubmit = async (data: UserFormValues) => {
    try {
      console.log('Creating user:', data);
      await createUser(data);
      setShowCreateUser(false);
      userForm.reset();
    } catch (error) {
      console.error('Error creating user:', error);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Role Management</h1>

      {/* Existing Roles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {isLoadingRoles ? (
          <div className="col-span-2 text-center py-4">Loading roles...</div>
        ) : !roles ? (
          <div className="col-span-2 text-center py-4">No roles found. Please check your connection.</div>
        ) : roles.length === 0 ? (
          <div className="col-span-2 text-center py-4">No roles available.</div>
        ) : (
          roles.map((role) => (
            <Card key={role.name} className="relative">
              <CardHeader>
                <CardTitle className="capitalize">{role.name}</CardTitle>
                <CardDescription>
                  {Array.isArray(role.permissions) ? `${role.permissions.length} permissions granted` : 'All permissions'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProtectedElement
                  requiredPermissions={['view_roles', 'manage_roles']}
                  fallback={<div className="text-sm text-muted-foreground">Permission details hidden</div>}
                >
                  <div className="space-y-2">
                    {Array.isArray(role.permissions) && role.permissions.map(permission => (
                      <div key={permission} className="text-sm text-muted-foreground">
                        • {permission.replace(/_/g, ' ')}
                      </div>
                    ))}
                  </div>
                </ProtectedElement>
                {role.name !== 'admin' && (
                  <ProtectedElement
                    requiredPermissions={['manage_roles']}
                    fallback={null}
                  >
                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          console.log('Editing role:', role);
                          setEditingRole(role.name);
                          form.reset({
                            name: role.name,
                            permissions: Array.isArray(role.permissions) ? role.permissions : [],
                            description: role.description || '',
                          });
                          toast({
                            title: "Edit Mode",
                            description: `Now editing ${role.name} role. Scroll down to modify permissions.`,
                          });
                        }}
                      >
                        Edit Permissions
                      </Button>
                      {editingRole === role.name && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingRole(null);
                            form.reset();
                            toast({
                              title: "Edit Cancelled",
                              description: "Role editing cancelled",
                            });
                          }}
                        >
                          Cancel Edit
                        </Button>
                      )}
                    </div>
                  </ProtectedElement>
                )}
                {isUpdating && editingRole === role.name && (
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                    <div className="text-sm text-muted-foreground">Updating role...</div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create/Edit Role Form */}
      <ProtectedElement
        requiredPermissions={['manage_roles']}
        fallback={<div className="text-muted-foreground text-center py-4">You don't have permission to manage roles.</div>}
      >
        <Card ref={formRef}>
          <CardHeader>
            <CardTitle>{editingRole ? `Edit Role: ${editingRole}` : 'Create New Role'}</CardTitle>
            <CardDescription>
              {editingRole ? `Modify permissions for the ${editingRole} role` : 'Define role permissions to control access to different features'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter role name"
                          disabled={!!editingRole}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Role description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4">
                  {Object.entries(permissionCategories).map(([category, permissions]) => (
                    <div key={category}>
                      <h3 className="font-medium capitalize mb-2">{category}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {permissions.map(permission => (
                          <FormField
                            key={permission}
                            control={form.control}
                            name="permissions"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(permission)}
                                    onCheckedChange={(checked) => {
                                      const newValue = checked
                                        ? [...field.value || [], permission]
                                        : field.value?.filter(p => p !== permission) || [];
                                      field.onChange(newValue);
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  {permission.replace(/_/g, ' ')}
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end space-x-4">
                  {editingRole && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setEditingRole(null);
                        form.reset();
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                  <Button type="submit" disabled={isCreating || isUpdating}>
                    {editingRole ? 'Update Role' : 'Create Role'}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </ProtectedElement>

      {/* User Role Management */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>User Roles</CardTitle>
          <CardDescription>Manage user role assignments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm text-muted-foreground">
              {users?.length || 0} users found
            </div>
            <ProtectedElement
              requiredPermissions={['manage_staff', 'manage_roles']}
              fallback={null}
            >
              <Button
                onClick={() => setShowCreateUser(true)}
                disabled={isCreatingUser}
              >
                {isCreatingUser ? 'Creating...' : 'Create User'}
              </Button>
            </ProtectedElement>
          </div>
          {isLoadingUsers ? (
            <div className="text-center py-4">Loading users...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Last Sign In</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.uid}>
                    <TableCell>{user.displayName || 'N/A'}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Select
                        value={user.role}
                        disabled={isUpdatingUserRole}
                        onValueChange={(value) => {
                          toast({
                            title: "Updating role...",
                            description: "Please wait while we update the user's role"
                          });
                          updateUserRole({ userId: user.uid, role: value });
                        }}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          {roles?.map((role) => (
                            <SelectItem key={role.id} value={role.name}>
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>{user.lastSignInTime || 'Never'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      {showCreateUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Create New User</h3>
            <Form {...userForm}>
              <form onSubmit={userForm.handleSubmit(onUserSubmit)} className="space-y-4">
                <FormField
                  control={userForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="user@example.com"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={userForm.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Full Name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={userForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                          <SelectContent>
                            {roles?.map((role) => (
                              <SelectItem key={role.id} value={role.name}>
                                {role.name}
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
                  control={userForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password (optional)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="password"
                          placeholder="Leave blank for default password"
                        />
                      </FormControl>
                      <FormDescription>
                        If not provided, user will get default password: Welcome123!
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={userForm.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number (optional)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="+91 9999999999"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCreateUser(false);
                      userForm.reset();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isCreatingUser}>
                    {isCreatingUser ? 'Creating...' : 'Create User'}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      )}
    </div>
  );
}