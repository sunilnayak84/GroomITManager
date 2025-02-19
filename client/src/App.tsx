
import React from 'react';
import { Route, Switch } from 'wouter';
import Layout from './components/Layout';
import RoleManagementPage from './pages/RoleManagementPage';
import StaffAvailabilityPage from './pages/staff-availability';

export default function App() {
  return (
    <Layout>
      <Switch>
        <Route path="/settings/roles" component={RoleManagementPage} />
        <Route path="/staff-availability" component={StaffAvailabilityPage} />
        <Route>
          <div className="flex items-center justify-center min-h-screen">
            <h1 className="text-2xl font-bold">404 Page Not Found</h1>
          </div>
        </Route>
      </Switch>
    </Layout>
  );
}
