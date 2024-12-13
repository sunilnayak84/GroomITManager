import { RoleManagement } from "@/components/RoleManagement";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function RoleManagementPage() {
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
