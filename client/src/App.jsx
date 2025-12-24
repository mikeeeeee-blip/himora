import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Login from "./components/Login";
import SuperadminDashboard from "./components/SuperadminDashboard";
import AdminDashboard from "./components/AdminDashboard";
import TransactionsPage from "./components/pages/TransactionsPage";
import PayoutsPage from "./components/pages/PayoutsPage";
import PayinsPage from "./components/pages/PayinsPage";
import BalancePage from "./components/pages/BalancePage";
import PaymentsPage from "./components/pages/PaymentsPage";
import SuperadminSignupPage from "./components/pages/SuperadminSignupPage";
import SuperadminTransactionsPage from "./components/pages/SuperadminTransactionsPage";
import SuperadminPayoutsPage from "./components/pages/PayoutsManagement";
import SuperadminMerchantsPage from "./components/pages/SuperadminMerchantsPage";
import MerchantDetailPage from "./components/pages/MerchantDetailPage";
import SuperadminPaymentGatewaySettings from "./components/pages/SuperadminPaymentGatewaySettings";
import WebhookPage from "./components/pages/WebhookPage";
import WebhookHowTo from "./components/pages/WebhookHowTo";
import ApiDocumentationPage from "./components/pages/ApiDocumentationPage";
import AuthWrapper from "./components/AuthWrapper";
import SuperadminLayout from "./components/SuperadminLayout";
import { USER_ROLES } from "./constants/api";
import TransactionDetailPage from "./components/pages/TransactionDetailPage";
import PaymentSuccess from "./components/pages/PaymentSuccess";
import PaymentFailed from "./components/pages/PaymentFailed";
import SubPaisaPaymentPage from "./components/pages/SubPaisaPaymentPage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/superadmin"
          element={
            <AuthWrapper requiredRole={USER_ROLES.SUPERADMIN}>
              <SuperadminLayout>
                <SuperadminDashboard />
              </SuperadminLayout>
            </AuthWrapper>
          }
        />
        <Route
          path="/superadmin/signup"
          element={
            <AuthWrapper requiredRole={USER_ROLES.SUPERADMIN}>
              <SuperadminLayout>
                <SuperadminSignupPage />
              </SuperadminLayout>
            </AuthWrapper>
          }
        />
        <Route
          path="/superadmin/transactions"
          element={
            <AuthWrapper requiredRole={USER_ROLES.SUPERADMIN}>
              <SuperadminLayout>
                <SuperadminTransactionsPage />
              </SuperadminLayout>
            </AuthWrapper>
          }
        />
        <Route
          path="/superadmin/payouts"
          element={
            <AuthWrapper requiredRole={USER_ROLES.SUPERADMIN}>
              <SuperadminLayout>
                <SuperadminPayoutsPage />
              </SuperadminLayout>
            </AuthWrapper>
          }
        />
        <Route
          path="/superadmin/merchants"
          element={
            <AuthWrapper requiredRole={USER_ROLES.SUPERADMIN}>
              <SuperadminLayout>
                <SuperadminMerchantsPage />
              </SuperadminLayout>
            </AuthWrapper>
          }
        />
        <Route
          path="/superadmin/merchants/:merchantId"
          element={
            <AuthWrapper requiredRole={USER_ROLES.SUPERADMIN}>
              <SuperadminLayout>
                <MerchantDetailPage />
              </SuperadminLayout>
            </AuthWrapper>
          }
        />
        <Route
          path="/superadmin/settings/payment-gateways"
          element={
            <AuthWrapper requiredRole={USER_ROLES.SUPERADMIN}>
              <SuperadminLayout>
                <SuperadminPaymentGatewaySettings />
              </SuperadminLayout>
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
              <PayinsPage />
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
          path="/admin/payments/subpaisa"
          element={
            <AuthWrapper requiredRole={USER_ROLES.ADMIN}>
              <SubPaisaPaymentPage />
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
        <Route
          path="/admin/webhooks/how-to"
          element={
            <AuthWrapper requiredRole={USER_ROLES.ADMIN}>
              <WebhookHowTo />
            </AuthWrapper>
          }
        />
        <Route
          path="/admin/api-docs"
          element={
            <AuthWrapper requiredRole={USER_ROLES.ADMIN}>
              <ApiDocumentationPage />
            </AuthWrapper>
          }
        />
        {/* Payment Result Pages (Public - No Auth Required) */}
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/payment-failed" element={<PaymentFailed />} />
        
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
