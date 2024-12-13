import { RoleManagement } from "@/components/RoleManagement";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function RoleManagementPage() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <RoleManagement />
    </ProtectedRoute>
  );
}
