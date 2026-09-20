import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { LoadingState } from '@/shared';
import { useAuth } from '@/stores/auth';
import { RouteGuard } from '@/components/RouteGuard';
import { PortalLayout } from '@/layouts/PortalLayout';
import { landingPathForRole } from '@/layouts/navigation';
import { NotFoundPage } from '@/pages/NotFoundPage';

// Pages are lazy-loaded so each role only downloads its own screens — a
// supplier never fetches the admin dashboard or the 370KB chart bundle.
const LoginPage = lazy(() => import('@/pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })));

const SupplierHome = lazy(() => import('@/pages/supplier/SupplierHome').then((m) => ({ default: m.SupplierHome })));
const SubmitStockPage = lazy(() => import('@/pages/supplier/SubmitStockPage').then((m) => ({ default: m.SubmitStockPage })));
const MyStockPage = lazy(() => import('@/pages/supplier/MyStockPage').then((m) => ({ default: m.MyStockPage })));
const SupplierOrdersPage = lazy(() => import('@/pages/supplier/SupplierOrdersPage').then((m) => ({ default: m.SupplierOrdersPage })));
const SupplierOrderDetail = lazy(() => import('@/pages/supplier/SupplierOrderDetail').then((m) => ({ default: m.SupplierOrderDetail })));
const CsrNotificationsPage = lazy(() => import('@/pages/supplier/CsrNotificationsPage').then((m) => ({ default: m.CsrNotificationsPage })));
const EarningsPage = lazy(() => import('@/pages/supplier/EarningsPage').then((m) => ({ default: m.EarningsPage })));
const SupplierSettingsPage = lazy(() => import('@/pages/supplier/SupplierSettingsPage').then((m) => ({ default: m.SupplierSettingsPage })));

const CsrHome = lazy(() => import('@/pages/csr/CsrHome').then((m) => ({ default: m.CsrHome })));
const CsrQueuePage = lazy(() => import('@/pages/csr/CsrQueuePage').then((m) => ({ default: m.CsrQueuePage })));
const CaseDetailPage = lazy(() => import('@/pages/csr/CaseDetailPage').then((m) => ({ default: m.CaseDetailPage })));
const CsrOrdersPage = lazy(() => import('@/pages/csr/CsrOrdersPage').then((m) => ({ default: m.CsrOrdersPage })));

const AdminHome = lazy(() => import('@/pages/admin/AdminHome').then((m) => ({ default: m.AdminHome })));
const CataloguePage = lazy(() => import('@/pages/admin/CataloguePage').then((m) => ({ default: m.CataloguePage })));
const ListingEditorPage = lazy(() => import('@/pages/admin/ListingEditorPage').then((m) => ({ default: m.ListingEditorPage })));
const SuppliersPage = lazy(() => import('@/pages/admin/SuppliersPage').then((m) => ({ default: m.SuppliersPage })));
const SupplierDetailPage = lazy(() => import('@/pages/admin/SupplierDetailPage').then((m) => ({ default: m.SupplierDetailPage })));
const AdminOrdersPage = lazy(() => import('@/pages/admin/AdminOrdersPage').then((m) => ({ default: m.AdminOrdersPage })));
const AdminOrderDetailPage = lazy(() => import('@/pages/admin/AdminOrderDetailPage').then((m) => ({ default: m.AdminOrderDetailPage })));
const BuyersPage = lazy(() => import('@/pages/admin/BuyersPage').then((m) => ({ default: m.BuyersPage })));
const BuyerDetailPage = lazy(() => import('@/pages/admin/BuyerDetailPage').then((m) => ({ default: m.BuyerDetailPage })));
const ReportsPage = lazy(() => import('@/pages/admin/ReportsPage').then((m) => ({ default: m.ReportsPage })));
const SettingsPage = lazy(() => import('@/pages/admin/SettingsPage').then((m) => ({ default: m.SettingsPage })));

/**
 * Every portal route is wrapped in a RouteGuard bound to a PortalSection.
 * Access is decided by ROLE_SECTIONS in the shared library — the same map the
 * sidebar is built from — so a CSR agent typing /admin/settings by hand hits
 * the same refusal as one who has no link to click.
 */
export function App() {
  return (
    <Suspense fallback={<LoadingState label="Loading…" className="min-h-[60vh]" />}>
      <Routes>
      {/* ---------------- Public ---------------- */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* ---------------- Portal ---------------- */}
      <Route element={<PortalLayout />}>
        <Route index element={<RoleLanding />} />

        {/* ---- Supplier ---- */}
        <Route
          path="/supplier"
          element={
            <RouteGuard section="supplier:home">
              <SupplierHome />
            </RouteGuard>
          }
        />
        <Route
          path="/supplier/submit-stock"
          element={
            <RouteGuard section="supplier:submit-stock">
              <SubmitStockPage />
            </RouteGuard>
          }
        />
        <Route
          path="/supplier/stock"
          element={
            <RouteGuard section="supplier:stock">
              <MyStockPage />
            </RouteGuard>
          }
        />
        <Route
          path="/supplier/orders"
          element={
            <RouteGuard section="supplier:orders">
              <SupplierOrdersPage />
            </RouteGuard>
          }
        />
        <Route
          path="/supplier/orders/:id"
          element={
            <RouteGuard section="supplier:orders">
              <SupplierOrderDetail />
            </RouteGuard>
          }
        />
        <Route
          path="/supplier/csr-notifications"
          element={
            <RouteGuard section="supplier:csr-notifications">
              <CsrNotificationsPage />
            </RouteGuard>
          }
        />
        <Route
          path="/supplier/earnings"
          element={
            <RouteGuard section="supplier:earnings">
              <EarningsPage />
            </RouteGuard>
          }
        />
        <Route
          path="/supplier/settings"
          element={
            <RouteGuard section="supplier:settings">
              <SupplierSettingsPage />
            </RouteGuard>
          }
        />

        {/* ---- CSR (Super Admin also has these sections) ---- */}
        <Route
          path="/csr"
          element={
            <RouteGuard section="csr:home">
              <CsrHome />
            </RouteGuard>
          }
        />
        <Route
          path="/csr/cases"
          element={
            <RouteGuard section="csr:queue">
              <CsrQueuePage />
            </RouteGuard>
          }
        />
        <Route
          path="/csr/cases/:id"
          element={
            <RouteGuard section="csr:case">
              <CaseDetailPage />
            </RouteGuard>
          }
        />
        <Route
          path="/csr/orders"
          element={
            <RouteGuard section="csr:orders">
              <CsrOrdersPage />
            </RouteGuard>
          }
        />

        {/* ---- Super Admin ---- */}
        <Route
          path="/admin"
          element={
            <RouteGuard section="admin:home">
              <AdminHome />
            </RouteGuard>
          }
        />
        <Route
          path="/admin/catalogue"
          element={
            <RouteGuard section="admin:catalogue">
              <CataloguePage />
            </RouteGuard>
          }
        />
        <Route
          path="/admin/catalogue/:id"
          element={
            <RouteGuard section="admin:catalogue">
              <ListingEditorPage />
            </RouteGuard>
          }
        />
        <Route
          path="/admin/suppliers"
          element={
            <RouteGuard section="admin:suppliers">
              <SuppliersPage />
            </RouteGuard>
          }
        />
        <Route
          path="/admin/suppliers/:id"
          element={
            <RouteGuard section="admin:suppliers">
              <SupplierDetailPage />
            </RouteGuard>
          }
        />
        <Route
          path="/admin/orders"
          element={
            <RouteGuard section="admin:orders">
              <AdminOrdersPage />
            </RouteGuard>
          }
        />
        <Route
          path="/admin/orders/:id"
          element={
            <RouteGuard section="admin:orders">
              <AdminOrderDetailPage />
            </RouteGuard>
          }
        />
        <Route
          path="/admin/buyers"
          element={
            <RouteGuard section="admin:buyers">
              <BuyersPage />
            </RouteGuard>
          }
        />
        <Route
          path="/admin/buyers/:id"
          element={
            <RouteGuard section="admin:buyers">
              <BuyerDetailPage />
            </RouteGuard>
          }
        />
        <Route
          path="/admin/reports"
          element={
            <RouteGuard section="admin:reports">
              <ReportsPage />
            </RouteGuard>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <RouteGuard section="admin:settings">
              <SettingsPage />
            </RouteGuard>
          }
        />

        <Route path="*" element={<NotFoundPage />} />
      </Route>
      </Routes>
    </Suspense>
  );
}

/** Sends each role to its own dashboard from the portal root. */
function RoleLanding() {
  const location = useLocation();
  const { user, loading, isAuthenticated, sessionEstablished } = useAuth();

  if (loading) return <LoadingState label="Loading your dashboard…" className="min-h-[60vh]" />;
  if (!isAuthenticated || !sessionEstablished) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <Navigate to={landingPathForRole(user?.role)} replace />;
}
