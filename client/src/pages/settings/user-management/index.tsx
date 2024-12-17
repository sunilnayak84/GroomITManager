
import { useRoles } from '@/hooks/use-roles';
import { ProtectedElement } from '@/components/ProtectedElement';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserRole } from '@/hooks/use-user';
import { toast } from '@/components/ui/use-toast';

export default function UserManagementPage() {
  const {
    users,
    isLoadingUsers,
    fetchNextPage,
    hasNextPage,
    updateUserRole,
    isUpdatingUserRole,
    roles
  } = useRoles();

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">User Management</h1>
      
      <ProtectedElement 
        requiredPermissions={['manage_roles']} 
        fallback={<div className="text-muted-foreground text-center py-4">You don't have permission to manage user roles.</div>}
      >
        <Card>
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
                            updateUserRole({ userId: user.uid, role: newRole });
                          }}
                          disabled={isUpdatingUserRole || user.role === 'admin'}
                        >
                          {roles?.map(role => (
                            <option key={role.name} value={role.name}>
                              {role.name}
                            </option>
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
