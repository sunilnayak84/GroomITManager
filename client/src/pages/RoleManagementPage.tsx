import { RoleManagement } from "@/components/RoleManagement";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function RoleManagementPage() {
  return (
    <ProtectedRoute allowedRoles={['admin', 'staff', 'manager', 'receptionist']}>
      <div className="container mx-auto p-4">
        <RoleManagement />
      </div>
    </ProtectedRoute>
  );
}
