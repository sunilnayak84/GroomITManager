
import { useEffect, useMemo } from "react";
import { useRoles } from '@/hooks/use-roles';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { ProtectedElement } from './ProtectedElement';

export function RoleManagement() {
  const {
    roles,
    isLoadingRoles,
  } = useRoles();

  useEffect(() => {
    if (roles) {
      console.log('Available roles:', roles.map(role => ({
        name: role.name,
        permissionCount: role.permissions?.length || 0,
      })));
    }
  }, [roles]);

  const roleEntries = useMemo(() => 
    roles ? roles.map(role => [role.name, role.permissions]) : [], 
    [roles]
  );

  return (
    <div className="container mx-auto p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {isLoadingRoles ? (
          <div className="col-span-3 text-center py-4">Loading roles...</div>
        ) : !roles ? (
          <div className="col-span-3 text-center py-4">No roles found. Please check your connection.</div>
        ) : (
          roles.map((role) => (
            <Card key={role.name} className="relative">
              <CardHeader className="p-4">
                <CardTitle className="capitalize text-lg">{role.name}</CardTitle>
                <CardDescription className="text-sm">
                  {role.description || `${role.permissions?.length || 0} permissions granted`}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <ProtectedElement 
                  requiredPermissions={['view_roles']} 
                  fallback={<div className="text-sm text-muted-foreground">Permission details hidden</div>}
                >
                  <div className="flex flex-wrap gap-2">
                    {role.permissions?.map(permission => (
                      <Badge key={permission} variant="secondary" className="text-xs">
                        {permission.replace(/_/g, ' ')}
                      </Badge>
                    ))}
                  </div>
                </ProtectedElement>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
