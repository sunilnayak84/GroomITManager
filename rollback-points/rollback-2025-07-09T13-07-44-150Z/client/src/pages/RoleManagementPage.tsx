import { RoleManagement } from "../components/RoleManagement";
import ProtectedRoute from "../components/ProtectedRoute";

export default function RoleManagementPage() {
  return (
    <ProtectedRoute>
      <div className="container mx-auto py-6">
        <RoleManagement />
      </div>
    </ProtectedRoute>
  );
}