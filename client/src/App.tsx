import React from 'react';
import { Route, Switch } from 'wouter';
import Layout from './components/Layout';
import RoleManagementPage from './pages/RoleManagementPage';
import StaffAvailabilityPage from './pages/staff-availability';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuthSync } from './hooks/use-auth-sync';
// Added components - placeholders for now
const BillingPage = () => <div>Billing Page Content</div>;
const BillDetails = () => <div>Bill Details</div>;


export default function App() {
  // Initialize auth sync
  useAuthSync();

  return (
    <Layout>
      <Switch>
        <Route path="/settings/role-management">
          <ProtectedRoute allowedRoles={['admin']}>
            <RoleManagementPage />
          </ProtectedRoute>
        </Route>
        <Route path="/staff-availability">
          <ProtectedRoute allowedRoles={['admin', 'manager']}>
            <StaffAvailabilityPage />
          </ProtectedRoute>
        </Route>
        <Route path="/billing">
          <BillingPage />
        </Route>
        <Route>
          <div className="flex items-center justify-center min-h-screen">
            <h1 className="text-2xl font-bold">404 Page Not Found</h1>
          </div>
        </Route>
      </Switch>
    </Layout>
  );
}