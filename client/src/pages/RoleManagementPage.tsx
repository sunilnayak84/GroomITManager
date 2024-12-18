import { RoleManagement } from "@/components/RoleManagement";
import ProtectedRoute from "@/components/ProtectedRoute";

function RoleManagementPage() {
  return (
    <ProtectedRoute 
      allowedRoles={['admin']} 
      requiresUserManagement={true}
    >
      <div className="container mx-auto py-6">
        <h1 className="text-2xl font-bold mb-6">Role Management</h1>
        <RoleManagement />
      </div>
    </ProtectedRoute>
  );
}

// Make sure we have both default and named exports
export { RoleManagementPage };
export default RoleManagementPage;
