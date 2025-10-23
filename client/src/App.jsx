import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import SuperadminDashboard from './components/SuperadminDashboard';
import AdminDashboard from './components/AdminDashboard';
import TransactionsPage from './components/pages/TransactionsPage';
import PayoutsPage from './components/pages/PayoutsPage';
import BalancePage from './components/pages/BalancePage';
import PaymentsPage from './components/pages/PaymentsPage';
import SuperadminSignupPage from './components/pages/SuperadminSignupPage';
import SuperadminTransactionsPage from './components/pages/SuperadminTransactionsPage';
import SuperadminPayoutsPage from './components/pages/PayoutsManagement';
import WebhookPage from './components/pages/WebhookPage';
import AuthWrapper from './components/AuthWrapper';
import { USER_ROLES } from './constants/api';
import TransactionDetailPage from './components/pages/TransactionDetailPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/superadmin"
          element={
            <AuthWrapper requiredRole={USER_ROLES.SUPERADMIN}>
              <SuperadminDashboard />
            </AuthWrapper>
          }
        />
        <Route
          path="/superadmin/signup"
          element={
            <AuthWrapper requiredRole={USER_ROLES.SUPERADMIN}>
              <SuperadminSignupPage />
            </AuthWrapper>
          }
        />
        <Route
          path="/superadmin/transactions"
          element={
            <AuthWrapper requiredRole={USER_ROLES.SUPERADMIN}>
              <SuperadminTransactionsPage />
            </AuthWrapper>
          }
        />
        <Route
          path="/superadmin/payouts"
          element={
            <AuthWrapper requiredRole={USER_ROLES.SUPERADMIN}>
              <SuperadminPayoutsPage />
            </AuthWrapper>
          }
        />
        <Route
          path="/admin"
          element={
            <AuthWrapper requiredRole={USER_ROLES.ADMIN}>
              <AdminDashboard />
            </AuthWrapper>
          }
        />
        <Route
          path="/admin/transactions"
          element={
            <AuthWrapper requiredRole={USER_ROLES.ADMIN}>
              <TransactionsPage />
            </AuthWrapper>
          }
        />
        <Route
          path="/admin/payouts"
          element={
            <AuthWrapper requiredRole={USER_ROLES.ADMIN}>
              <PayoutsPage />
            </AuthWrapper>
          }
        />
        <Route
          path="/admin/payins"
          element={
            <AuthWrapper requiredRole={USER_ROLES.ADMIN}>
              <BalancePage />
            </AuthWrapper>
          }
        />
        <Route
          path="/admin/transactions/:transactionId"
          element={
            <AuthWrapper requiredRole={USER_ROLES.ADMIN}>
              <TransactionDetailPage />
            </AuthWrapper>
          }
        />
        <Route
          path="/admin/payments"
          element={
            <AuthWrapper requiredRole={USER_ROLES.ADMIN}>
              <PaymentsPage />
            </AuthWrapper>
          }
        />
        <Route
          path="/admin/webhooks"
          element={
            <AuthWrapper requiredRole={USER_ROLES.ADMIN}>
              <WebhookPage />
            </AuthWrapper>
          }
        />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App
