import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import authService from '../services/authService';
import { USER_ROLES } from '../constants/api';

const AuthWrapper = ({ children, requiredRole }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const checkAuth = () => {
      const authenticated = authService.isAuthenticated();
      const role = authService.getRole();
      
      setIsAuthenticated(authenticated);
      setUserRole(role);
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px'
      }}>
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

 // ✅ Allow SuperAdmin and SubSuperAdmin to access Admin routes
if (requiredRole === USER_ROLES.ADMIN && (userRole === USER_ROLES.SUPERADMIN || userRole === USER_ROLES.SUB_SUPERADMIN)) {
  return children; // SuperAdmin and SubSuperAdmin can access admin routes
}

// ✅ Handle array of required roles
if (Array.isArray(requiredRole)) {
  if (requiredRole.includes(userRole)) {
    return children;
  }
} else {
  // ✅ Allow SubSuperAdmin to access SuperAdmin routes (with backend access control)
  if (requiredRole === USER_ROLES.SUPERADMIN && userRole === USER_ROLES.SUB_SUPERADMIN) {
    return children; // SubSuperAdmin can access superadmin routes (backend will check permissions)
  }
}

  // Check if role matches (handle both single role and array of roles)
  const roleMatches = Array.isArray(requiredRole) 
    ? requiredRole.includes(userRole)
    : userRole === requiredRole;
    
  if (requiredRole && !roleMatches) {
  // Redirect to appropriate dashboard based on user's actual role
  if (userRole === USER_ROLES.SUPERADMIN) {
    return <Navigate to="/superadmin" replace />;
  } else if (userRole === USER_ROLES.SUB_SUPERADMIN) {
    return <Navigate to="/sub-superadmin" replace />;
  } else if (userRole === USER_ROLES.ADMIN) {
    return <Navigate to="/admin" replace />;
  } else {
    return <Navigate to="/login" replace />;
  }
}


  return children;
};

export default AuthWrapper;
