import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

// Dummy components
const StaffAvailabilityPage = () => <h1>Staff Availability</h1>;
const RoleManagementPage = () => <h1>Role Management</h1>;

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/staff-availability" element={<StaffAvailabilityPage />} />
        <Route path="/roles" element={<RoleManagementPage />} /> {/* Updated route */}
      </Routes>
    </Router>
  );
}

export default App;