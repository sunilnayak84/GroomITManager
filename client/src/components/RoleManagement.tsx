import React from 'react';
import { useRoles } from '@/hooks/use-roles';
import type { UserRole } from '@/hooks/use-user';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import { RolePermissions } from '@/hooks/use-user';

// Schema for role creation/editing
const roleSchema = z.object({
  name: z.string().min(2, 'Role name must be at least 2 characters'),
  permissions: z.array(z.string()),
  description: z.string().optional(),
});

type RoleFormValues = z.infer<typeof roleSchema>;

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
    // Log state for debugging
    console.log('Role Management State:', {
      roles,
      isLoadingRoles,
      users,
      isLoadingUsers,
      hasNextPage
    });
  }, [roles, isLoadingRoles, users, isLoadingUsers, hasNextPage]);

  const roleEntries = React.useMemo(() => 
    roles ? roles.map(role => [role.name, role.permissions]) : [], 
    [roles]
  );

  const [selectedUser, setSelectedUser] = React.useState<string | null>(null);
  const [editingRole, setEditingRole] = React.useState<string | null>(null);

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
      if (editingRole) {
        await updateRole({
          name: data.name,
          permissions: data.permissions
        });
      } else {
        await createRole({
          name: data.name,
          permissions: data.permissions
        });
      }
      
      toast({
        title: 'Success',
        description: `Role ${editingRole ? 'updated' : 'created'} successfully`,
      });
      setEditingRole(null);
      form.reset();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save role',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Role Management</h1>
      
      {/* Existing Roles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {roles?.map((role) => (
          <Card key={role.name}>
            <CardHeader>
              <CardTitle className="capitalize">{role.name}</CardTitle>
              <CardDescription>
                {Array.isArray(role.permissions) ? `${role.permissions.length} permissions granted` : 'All permissions'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Array.isArray(role.permissions) && role.permissions.map(permission => (
                  <div key={permission} className="text-sm text-muted-foreground">
                    • {permission.replace(/_/g, ' ')}
                  </div>
                ))}
              </div>
              {role.name !== 'admin' && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setEditingRole(role.name);
                    form.reset({
                      name: role.name,
                      permissions: Array.isArray(role.permissions) ? role.permissions : [],
                    });
                  }}
                >
                  Edit Role
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create/Edit Role Form */}
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
                      <Input {...field} placeholder="Enter role name" />
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

      {/* User Role Management */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>User Role Management</CardTitle>
          <CardDescription>
            Assign roles to users in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isLoadingUsers ? (
              <div>Loading users...</div>
            ) : (
              <div className="space-y-4">
                {users.map(user => (
                  <div
                    key={user.uid}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div>
                      <p className="font-medium">{user.email}</p>
                      <p className="text-sm text-muted-foreground">
                        Current Role: <span className="font-semibold capitalize">{user.role}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <select
                        className="border rounded p-2 bg-white"
                        value={user.role}
                        onChange={(e) => {
                          const newRole = e.target.value as UserRole;
                          // Additional validation for role changes
                          if (newRole === 'admin') {
                            if (!window.confirm('Are you sure you want to grant admin privileges to this user? This action cannot be undone.')) {
                              return;
                            }
                            // Additional check for admin email
                            if (!user.email?.endsWith('@groomery.in') && process.env.NODE_ENV !== 'development') {
                              toast({
                                title: "Invalid Email Domain",
                                description: "Admin users must have a @groomery.in email address.",
                                variant: "destructive"
                              });
                              return;
                            }
                          }
                          
                          updateUserRole({ 
                            userId: user.uid, 
                            role: newRole 
                          });
                        }}
                        disabled={isUpdatingUserRole || user.role === 'admin'}
                      >
                        <option value="admin">Admin</option>
                        <option value="manager">Manager</option>
                        <option value="staff">Staff</option>
                        <option value="receptionist">Receptionist</option>
                      </select>
                      {isUpdatingUserRole && (
                        <div className="text-sm text-blue-600">
                          Updating...
                        </div>
                      )}
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
                Load More Users
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}