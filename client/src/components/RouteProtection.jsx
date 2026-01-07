import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import { USER_ROLES } from '../constants/api';

/**
 * RouteProtection Middleware
 * Prevents SuperAdmin from accessing /admin routes and vice versa
 */
const RouteProtection = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [shouldRender, setShouldRender] = useState(true);

  useEffect(() => {
    // Only check if user is authenticated
    if (!authService.isAuthenticated()) {
      return;
    }

    const userRole = authService.getRole();
    const currentPath = location.pathname;

    // Prevent SuperAdmin from accessing /admin routes
    if (userRole === USER_ROLES.SUPERADMIN && currentPath.startsWith('/admin')) {
      setShouldRender(false);
      navigate('/superadmin', { replace: true });
      return;
    }

    // Prevent SubSuperAdmin from accessing /admin routes
    if (userRole === USER_ROLES.SUB_SUPERADMIN && currentPath.startsWith('/admin')) {
      setShouldRender(false);
      navigate('/sub-superadmin', { replace: true });
      return;
    }

    // Prevent Admin from accessing /superadmin routes
    if (userRole === USER_ROLES.ADMIN && currentPath.startsWith('/superadmin')) {
      setShouldRender(false);
      navigate('/admin', { replace: true });
      return;
    }

    // Prevent Admin from accessing /sub-superadmin routes
    if (userRole === USER_ROLES.ADMIN && currentPath.startsWith('/sub-superadmin')) {
      setShouldRender(false);
      navigate('/admin', { replace: true });
      return;
    }

    setShouldRender(true);
  }, [location.pathname, navigate]);

  if (!shouldRender) {
    return null;
  }

  return <>{children}</>;
};

export default RouteProtection;

