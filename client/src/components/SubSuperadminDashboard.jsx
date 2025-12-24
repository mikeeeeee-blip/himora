// components/SubSuperadminDashboard.jsx
// This component reuses SuperadminDashboard logic
// Access controls are enforced by backend middleware

import React from 'react';
import SuperadminDashboard from './SuperadminDashboard';

const SubSuperadminDashboard = () => {
  // Sub-superadmin dashboard uses the same dashboard as superadmin
  // Backend middleware will enforce access controls based on permissions
  return <SuperadminDashboard />;
};

export default SubSuperadminDashboard;

