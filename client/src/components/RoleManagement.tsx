import { useEffect, useState, useMemo } from "react";
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

      {/* Create/Edit Role Form */}
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

      {/* User Role Management */}
      <ProtectedElement 
        requiredPermissions={['manage_roles']} 
        fallback={<div className="text-muted-foreground text-center py-4">You don't have permission to manage user roles.</div>}
      >
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
                          if (newRole === 'admin') {
                            if (!window.confirm('Are you sure you want to grant admin privileges to this user? This action cannot be undone.')) {
                              return;
                            }
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
                        {roles?.map(role => (
                          <option key={role.name} value={role.name}>
                            {role.name.charAt(0).toUpperCase() + role.name.slice(1)}
                          </option>
                        ))}
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
      </ProtectedElement>
    </div>
  );
}
