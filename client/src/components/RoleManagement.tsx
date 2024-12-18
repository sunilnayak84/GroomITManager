import { useEffect, useState, useMemo } from "react";
import { useRoles, updateUserStatus, resetUserPassword } from '@/hooks/use-roles';
import type { UserRole, RolePermissions } from '@/hooks/use-user';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useElementVisibility } from '../hooks/use-element-visibility';
import { ProtectedElement } from './ProtectedElement';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/use-toast';
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
import { Checkbox } from '@/components/ui/checkbox';

// Schema for role creation/editing
const roleSchema = z.object({
  name: z.string()
    .min(2, 'Role name must be at least 2 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Role name can only contain letters, numbers, underscores, and hyphens')
    .transform(val => val.toLowerCase()),
  permissions: z.array(z.string()),
  description: z.string().min(10, 'Description must be at least 10 characters').optional(),
  isStaffRole: z.boolean().default(false),
  maxDailyAppointments: z.number().min(0).optional(),
  allowedServices: z.array(z.string()).optional(),
  canManageInventory: z.boolean().default(false),
});

// Extended type for role management
type RoleFormValues = z.infer<typeof roleSchema> & {
  isSystem?: boolean;
  createdAt?: number;
  updatedAt?: number;
};

// Group permissions by category for better organization
const permissionCategories = {
  appointments: [
    'manage_appointments',
    'view_appointments',
    'create_appointments',
    'cancel_appointments',
  ],
  customers: [
    'manage_customers',
    'view_customers',
    'create_customers',
    'edit_customer_info',
  ],
  services: [
    'manage_services',
    'view_services',
    'create_services',
    'edit_services',
  ],
  inventory: [
    'manage_inventory',
    'view_inventory',
    'update_stock',
    'manage_consumables',
  ],
  staff: [
    'manage_staff_schedule',
    'view_staff_schedule',
    'manage_own_schedule',
  ],
  reports: [
    'view_analytics',
    'view_reports',
    'view_financial_reports',
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
    fetchNextPage,
    hasNextPage,
    updateUserRole,
    isUpdatingUserRole
  } = useRoles();

  useEffect(() => {
    // Enhanced debugging logs
    console.log('Role Management State:', {
      roles,
      isLoadingRoles,
      users,
      isLoadingUsers,
      hasNextPage
    });

    if (roles) {
      console.log('Available roles:', roles.map(role => ({
        name: role.name,
        permissionCount: role.permissions?.length || 0,
        permissions: role.permissions
      })));
    }
  }, [roles, isLoadingRoles, users, isLoadingUsers, hasNextPage]);

  const roleEntries = useMemo(() => 
    roles ? roles.map(role => [role.name, role.permissions]) : [], 
    [roles]
  );

  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<string | null>(null);

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: '',
      permissions: [],
      description: '',
    },
  });

  const onSubmit = async (data: RoleFormValues) => {
    try {
      console.log('Submitting role data:', data);
      
      if (editingRole) {
        console.log('Updating existing role:', editingRole);
        await updateRole({
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

  return (
    <div className="container mx-auto p-6">
      <Tabs defaultValue="system-roles" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="system-roles">System Roles</TabsTrigger>
          <TabsTrigger value="custom-roles">Custom Roles</TabsTrigger>
          <TabsTrigger value="staff-roles">Staff Management</TabsTrigger>
        </TabsList>

        <TabsContent value="system-roles">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {isLoadingRoles ? (
              <div className="col-span-3 text-center py-4">Loading roles...</div>
            ) : !roles ? (
              <div className="col-span-3 text-center py-4">No roles found. Please check your connection.</div>
            ) : roles.length === 0 ? (
              <div className="col-span-3 text-center py-4">No roles available.</div>
            ) : (
              roles.filter(role => role.name !== 'admin').map((role) => (
                <Card key={role.name} className="relative">
                  <CardHeader className="p-4">
                    <CardTitle className="capitalize text-lg">{role.name}</CardTitle>
                    <CardDescription className="text-sm">
                      {Array.isArray(role.permissions) ? `${role.permissions.length} permissions granted` : 'All permissions'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <ProtectedElement 
                      requiredPermissions={['view_roles', 'manage_roles']} 
                      fallback={<div className="text-sm text-muted-foreground">Permission details hidden</div>}
                    >
                      <div className="text-sm text-muted-foreground mb-4">
                        {/* Permission count shown in CardDescription */}
                      </div>
                    </ProtectedElement>
                    {role.name !== 'admin' && (
                      <ProtectedElement 
                        requiredPermissions={['manage_roles']} 
                        fallback={null}
                      >
                        <Button
                          variant="outline"
                          className="mt-4"
                          onClick={() => {
                            console.log('Editing role:', role);
                            setEditingRole(role.name);
                            form.reset({
                              name: role.name,
                              permissions: Array.isArray(role.permissions) ? role.permissions : [],
                              description: '',
                            });
                          }}
                        >
                          Edit Role
                        </Button>
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
        </TabsContent>

        <TabsContent value="custom-roles">
          <ProtectedElement 
            requiredPermissions={['manage_roles']} 
            fallback={<div className="text-muted-foreground text-center py-4">You don't have permission to manage roles.</div>}
          >
            <Card>
              <CardHeader>
                <CardTitle>{editingRole ? 'Edit Role' : 'Create New Role'}</CardTitle>
                <CardDescription>
                  Define role permissions to control access to different features
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
                      <Button type="submit">
                        {editingRole ? 'Update Role' : 'Create Role'}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </ProtectedElement>
        </TabsContent>

        <TabsContent value="staff-roles">
          <ProtectedElement 
            requiredPermissions={['manage_staff_schedule', 'manage_roles']} 
            fallback={<div className="text-muted-foreground text-center py-4">You don't have permission to manage staff roles.</div>}
          >
            <Card>
              <CardHeader>
                <CardTitle>Staff Role Management</CardTitle>
                <CardDescription>
                  Manage staff roles and permissions across branches
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {isLoadingUsers ? (
                    <div>Loading staff members...</div>
                  ) : (
                    <div className="space-y-4">
                      {users
                        .filter(user => user.role === 'staff')
                        .map(staff => (
                        <div
                          key={staff.uid}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                        >
                          <div>
                            <p className="font-medium">{staff.email}</p>
                            <p className="text-sm text-muted-foreground">
                              Branch: {staff.branch || staff.branchId || 'All Branches'}
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <Switch
                              checked={!staff.disabled}
                              onCheckedChange={async (enabled) => {
                                try {
                                  await updateUserStatus(staff.uid, !enabled);
                                  toast({
                                    title: "Success",
                                    description: `Staff member ${enabled ? 'enabled' : 'disabled'} successfully`
                                  });
                                } catch (error) {
                                  toast({
                                    title: "Error",
                                    description: "Failed to update staff status",
                                    variant: "destructive"
                                  });
                                }
                              }}
                            />
                            <select
                              className="border rounded p-2 bg-white"
                              defaultValue={staff.permissions?.join(',')}
                              onChange={(e) => {
                                const newPermissions = e.target.value.split(',').filter(Boolean);
                                updateUserRole({ 
                                  userId: staff.uid, 
                                  role: 'staff',
                                  permissions: newPermissions 
                                });
                              }}
                            >
                              {Object.entries(permissionCategories).map(([category, permissions]) => (
                                <optgroup key={category} label={category.replace(/_/g, ' ')}>
                                  {permissions.map(permission => (
                                    <option key={permission} value={permission}>
                                      {permission.replace(/_/g, ' ')}
                                    </option>
                                  ))}
                                </optgroup>
                              ))}
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {hasNextPage && (
                    <Button
                      onClick={() => fetchNextPage()}
                      variant="outline"
                      className="w-full"
                    >
                      Load More Staff Members
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </ProtectedElement>
        </TabsContent>
      </Tabs>
    </div>
  );
}
