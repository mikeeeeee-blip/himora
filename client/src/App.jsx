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
import RouteProtection from "./components/RouteProtection";
import SuperadminLayout from "./components/SuperadminLayout";
import { USER_ROLES } from "./constants/api";
import TransactionDetailPage from "./components/pages/TransactionDetailPage";
import PaymentSuccess from "./components/pages/PaymentSuccess";
import PaymentFailed from "./components/pages/PaymentFailed";
import SubPaisaPaymentPage from "./components/pages/SubPaisaPaymentPage";
import SubSuperadminManagementPage from "./components/pages/SubSuperadminManagementPage";
import SubSuperadminDashboard from "./components/SubSuperadminDashboard";
import ReconShowcasePage from "./components/pages/ReconShowcasePage";
import ReconRunDetailPage from "./components/pages/ReconRunDetailPage";
import ReconJournalDetailPage from "./components/pages/ReconJournalDetailPage";
import ReconExceptionDetailPage from "./components/pages/ReconExceptionDetailPage";
import LedgerPage from "./components/pages/LedgerPage";
import LedgerJournalDetailPage from "./components/pages/LedgerJournalDetailPage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/reconciliation-showcase"
          element={
            <RouteProtection>
              <AuthWrapper requiredRole={USER_ROLES.SUPERADMIN}>
                <SuperadminLayout>
                  <ReconShowcasePage />
                </SuperadminLayout>
              </AuthWrapper>
            </RouteProtection>
          }
        />
        <Route
          path="/reconciliation-showcase/runs/:runId"
          element={
            <RouteProtection>
              <AuthWrapper requiredRole={USER_ROLES.SUPERADMIN}>
                <SuperadminLayout>
                  <ReconRunDetailPage />
                </SuperadminLayout>
              </AuthWrapper>
            </RouteProtection>
          }
        />
        <Route
          path="/reconciliation-showcase/journal/:id"
          element={
            <RouteProtection>
              <AuthWrapper requiredRole={USER_ROLES.SUPERADMIN}>
                <SuperadminLayout>
                  <ReconJournalDetailPage />
                </SuperadminLayout>
              </AuthWrapper>
            </RouteProtection>
          }
        />
        <Route
          path="/reconciliation-showcase/exceptions/:id"
          element={
            <RouteProtection>
              <AuthWrapper requiredRole={USER_ROLES.SUPERADMIN}>
                <SuperadminLayout>
                  <ReconExceptionDetailPage />
                </SuperadminLayout>
              </AuthWrapper>
            </RouteProtection>
          }
        />
        <Route
          path="/superadmin"
          element={
            <RouteProtection>
              <AuthWrapper requiredRole={USER_ROLES.SUPERADMIN}>
                <SuperadminLayout>
                  <SuperadminDashboard />
                </SuperadminLayout>
              </AuthWrapper>
            </RouteProtection>
          }
        />
        <Route
          path="/superadmin/signup"
          element={
            <RouteProtection>
              <AuthWrapper requiredRole={USER_ROLES.SUPERADMIN}>
                <SuperadminLayout>
                  <SuperadminSignupPage />
                </SuperadminLayout>
              </AuthWrapper>
            </RouteProtection>
          }
        />
        <Route
          path="/superadmin/transactions"
          element={
            <RouteProtection>
              <AuthWrapper requiredRole={USER_ROLES.SUPERADMIN}>
                <SuperadminLayout>
                  <SuperadminTransactionsPage />
                </SuperadminLayout>
              </AuthWrapper>
            </RouteProtection>
          }
        />
        <Route
          path="/superadmin/payouts"
          element={
            <RouteProtection>
              <AuthWrapper requiredRole={USER_ROLES.SUPERADMIN}>
                <SuperadminLayout>
                  <SuperadminPayoutsPage />
                </SuperadminLayout>
              </AuthWrapper>
            </RouteProtection>
          }
        />
        <Route
          path="/superadmin/merchants"
          element={
            <RouteProtection>
              <AuthWrapper requiredRole={USER_ROLES.SUPERADMIN}>
                <SuperadminLayout>
                  <SuperadminMerchantsPage />
                </SuperadminLayout>
              </AuthWrapper>
            </RouteProtection>
          }
        />
        <Route
          path="/superadmin/merchants/:merchantId"
          element={
            <RouteProtection>
              <AuthWrapper requiredRole={USER_ROLES.SUPERADMIN}>
                <SuperadminLayout>
                  <MerchantDetailPage />
                </SuperadminLayout>
              </AuthWrapper>
            </RouteProtection>
          }
        />
        <Route
          path="/superadmin/settings/payment-gateways"
          element={
            <RouteProtection>
              <AuthWrapper requiredRole={[USER_ROLES.SUPERADMIN, USER_ROLES.SUB_SUPERADMIN]}>
                <SuperadminLayout>
                  <SuperadminPaymentGatewaySettings />
                </SuperadminLayout>
              </AuthWrapper>
            </RouteProtection>
          }
        />
        <Route
          path="/superadmin/sub-superadmins"
          element={
            <RouteProtection>
              <AuthWrapper requiredRole={USER_ROLES.SUPERADMIN}>
                <SuperadminLayout>
                  <SubSuperadminManagementPage />
                </SuperadminLayout>
              </AuthWrapper>
            </RouteProtection>
          }
        />
        <Route
          path="/superadmin/ledger"
          element={
            <RouteProtection>
              <AuthWrapper requiredRole={USER_ROLES.SUPERADMIN}>
                <SuperadminLayout>
                  <LedgerPage />
                </SuperadminLayout>
              </AuthWrapper>
            </RouteProtection>
          }
        />
        <Route
          path="/superadmin/ledger/journal/:id"
          element={
            <RouteProtection>
              <AuthWrapper requiredRole={USER_ROLES.SUPERADMIN}>
                <SuperadminLayout>
                  <LedgerJournalDetailPage />
                </SuperadminLayout>
              </AuthWrapper>
            </RouteProtection>
          }
        />
        {/* Sub-SuperAdmin Routes */}
        <Route
          path="/sub-superadmin"
          element={
            <RouteProtection>
              <AuthWrapper requiredRole={USER_ROLES.SUB_SUPERADMIN}>
                <SuperadminLayout>
                  <SubSuperadminDashboard />
                </SuperadminLayout>
              </AuthWrapper>
            </RouteProtection>
          }
        />
        <Route
          path="/sub-superadmin/transactions"
          element={
            <RouteProtection>
              <AuthWrapper requiredRole={USER_ROLES.SUB_SUPERADMIN}>
                <SuperadminLayout>
                  <SuperadminTransactionsPage />
                </SuperadminLayout>
              </AuthWrapper>
            </RouteProtection>
          }
        />
        <Route
          path="/sub-superadmin/payouts"
          element={
            <RouteProtection>
              <AuthWrapper requiredRole={USER_ROLES.SUB_SUPERADMIN}>
                <SuperadminLayout>
                  <SuperadminPayoutsPage />
                </SuperadminLayout>
              </AuthWrapper>
            </RouteProtection>
          }
        />
        <Route
          path="/sub-superadmin/merchants"
          element={
            <RouteProtection>
              <AuthWrapper requiredRole={USER_ROLES.SUB_SUPERADMIN}>
                <SuperadminLayout>
                  <SuperadminMerchantsPage />
                </SuperadminLayout>
              </AuthWrapper>
            </RouteProtection>
          }
        />
        <Route
          path="/sub-superadmin/merchants/:merchantId"
          element={
            <RouteProtection>
              <AuthWrapper requiredRole={USER_ROLES.SUB_SUPERADMIN}>
                <SuperadminLayout>
                  <MerchantDetailPage />
                </SuperadminLayout>
              </AuthWrapper>
            </RouteProtection>
          }
        />
        <Route
          path="/admin"
          element={
            <RouteProtection>
              <AuthWrapper requiredRole={USER_ROLES.ADMIN}>
                <AdminDashboard />
              </AuthWrapper>
            </RouteProtection>
          }
        />
        <Route
          path="/admin/transactions"
          element={
            <RouteProtection>
              <AuthWrapper requiredRole={USER_ROLES.ADMIN}>
                <TransactionsPage />
              </AuthWrapper>
            </RouteProtection>
          }
        />
        <Route
          path="/admin/payouts"
          element={
            <RouteProtection>
              <AuthWrapper requiredRole={USER_ROLES.ADMIN}>
                <PayoutsPage />
              </AuthWrapper>
            </RouteProtection>
          }
        />
        <Route
          path="/admin/payins"
          element={
            <RouteProtection>
              <AuthWrapper requiredRole={USER_ROLES.ADMIN}>
                <PayinsPage />
              </AuthWrapper>
            </RouteProtection>
          }
        />
        <Route
          path="/admin/transactions/:transactionId"
          element={
            <RouteProtection>
              <AuthWrapper requiredRole={USER_ROLES.ADMIN}>
                <TransactionDetailPage />
              </AuthWrapper>
            </RouteProtection>
          }
        />
        <Route
          path="/admin/payments"
          element={
            <RouteProtection>
              <AuthWrapper requiredRole={USER_ROLES.ADMIN}>
                <PaymentsPage />
              </AuthWrapper>
            </RouteProtection>
          }
        />
        <Route
          path="/admin/payments/subpaisa"
          element={
            <RouteProtection>
              <AuthWrapper requiredRole={USER_ROLES.ADMIN}>
                <SubPaisaPaymentPage />
              </AuthWrapper>
            </RouteProtection>
          }
        />
        <Route
          path="/admin/webhooks"
          element={
            <RouteProtection>
              <AuthWrapper requiredRole={USER_ROLES.ADMIN}>
                <WebhookPage />
              </AuthWrapper>
            </RouteProtection>
          }
        />
        <Route
          path="/admin/webhooks/how-to"
          element={
            <RouteProtection>
              <AuthWrapper requiredRole={USER_ROLES.ADMIN}>
                <WebhookHowTo />
              </AuthWrapper>
            </RouteProtection>
          }
        />
        <Route
          path="/admin/api-docs"
          element={
            <RouteProtection>
              <AuthWrapper requiredRole={USER_ROLES.ADMIN}>
                <ApiDocumentationPage />
              </AuthWrapper>
            </RouteProtection>
          }
        />
        {/* Public pages (no auth) */}
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/payment-failed" element={<PaymentFailed />} />
        
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
