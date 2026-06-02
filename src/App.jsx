import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './hooks/useToast';
import { Container } from 'lucide-react';
import { lazy, Suspense } from 'react';

// Layouts — eagerly loaded (always needed)
import AdminLayout from './components/layout/AdminLayout';
import CustomerLayout from './components/layout/CustomerLayout';

// Auth Pages — eagerly loaded (first thing users see)
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';

// ─── Lazy-loaded Pages ─────────────────────────────────────────────────────
// Each page is loaded on-demand only when the user navigates to it.
// This splits the 826 kB bundle into smaller, route-specific chunks.

// Customer Pages
const HomePage = lazy(() => import('./pages/customer/HomePage'));
const CustOrdersPage = lazy(() => import('./pages/customer/OrdersPage'));
const CustOrderDetailPage = lazy(() => import('./pages/customer/OrderDetailPage'));
const BookShipmentPage = lazy(() => import('./pages/customer/BookShipmentPage'));
const CustTripsPage = lazy(() => import('./pages/customer/TripsPage'));
const NotificationsPage = lazy(() => import('./pages/customer/NotificationsPage'));
const CustProfilePage = lazy(() => import('./pages/customer/ProfilePage'));
const CustPersonalInfoPage = lazy(() => import('./pages/customer/PersonalInfoPage'));
const SupportChatPage = lazy(() => import('./pages/customer/SupportChatPage'));

// Admin Pages
const DashboardPage = lazy(() => import('./pages/admin/DashboardPage'));
const AdminOrdersPage = lazy(() => import('./pages/admin/OrdersPage'));
const AdminOrderDetailPage = lazy(() => import('./pages/admin/OrderDetailPage'));
const AdminTripsPage = lazy(() => import('./pages/admin/TripsPage'));
const CreateTripPage = lazy(() => import('./pages/admin/CreateTripPage'));
const TripDetailPage = lazy(() => import('./pages/admin/TripDetailPage'));
const CustomersPage = lazy(() => import('./pages/admin/CustomersPage'));
const CustomerDetailPage = lazy(() => import('./pages/admin/CustomerDetailPage'));
const SalesPage = lazy(() => import('./pages/admin/SalesPage'));
const ReportsPage = lazy(() => import('./pages/admin/ReportsPage'));
const AnnouncementsPage = lazy(() => import('./pages/admin/AnnouncementsPage'));
const InboxPage = lazy(() => import('./pages/admin/InboxPage'));
const SettingsPage = lazy(() => import('./pages/admin/SettingsPage'));
const ContactInquiriesPage = lazy(() => import('./pages/admin/ContactInquiriesPage'));

// Public Pages
const TrackingPage = lazy(() => import('./pages/public/TrackingPage'));
const AboutPage = lazy(() => import('./pages/public/AboutPage'));

// ─── Loading Screens ────────────────────────────────────────────────────────

const LoadingScreen = () => (
  <div className="loading-screen">
    <div className="loading-brand animate-scale-in">
      <Container size={36} color="var(--primary)" />
      <h1>
        <span style={{ color: 'var(--accent)' }}>CARGO</span>
        <span style={{ color: 'var(--primary)' }}>EXPRESS</span>
      </h1>
    </div>
    <div className="spinner" />
    <p>Loading CargoExpress PH...</p>
  </div>
);

/** Lightweight page-level suspense fallback (inside layouts) */
const PageLoader = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '40vh',
  }}>
    <div className="spinner" />
  </div>
);

// ─── Route Guards ───────────────────────────────────────────────────────────

const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, userProfile, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (!userProfile) return <Navigate to="/login" replace />;
  
  if (requiredRole && userProfile.role !== requiredRole) {
    // If role is null/undefined (profile fetch failed), send to login
    // instead of redirecting to a role-based route that also rejects null,
    // which would create an infinite redirect loop.
    if (!userProfile.role) return <Navigate to="/login" replace />;
    return <Navigate to={userProfile.role === 'admin' ? '/admin' : '/customer'} replace />;
  }
  return children;
};

const AuthRoute = ({ children }) => {
  const { user, userProfile, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  // Only redirect away from auth pages if the user has a valid role.
  // If role is null (profile fetch failed), stay on login so the user
  // can re-authenticate, which retries the profile fetch.
  if (user && userProfile && userProfile.role) {
    return <Navigate to={userProfile.role === 'admin' ? '/admin' : '/customer'} replace />;
  }
  return children;
};

const RootRedirect = () => {
  const { user, userProfile, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (!userProfile || !userProfile.role) return <Navigate to="/login" replace />;
  return <Navigate to={userProfile.role === 'admin' ? '/admin' : '/customer'} replace />;
};


function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Suspense fallback={<LoadingScreen />}>
          <Routes>
            {/* Root */}
            <Route path="/" element={<RootRedirect />} />

            {/* Public (lazy) */}
            <Route path="/track" element={<TrackingPage />} />
            <Route path="/about" element={<AboutPage />} />

            {/* Auth (eager — first thing users see) */}
            <Route path="/login" element={<AuthRoute><LoginPage /></AuthRoute>} />
            <Route path="/register" element={<AuthRoute><RegisterPage /></AuthRoute>} />
            <Route path="/forgot-password" element={<AuthRoute><ForgotPasswordPage /></AuthRoute>} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Customer — each child page loads on demand */}
            <Route path="/customer" element={<ProtectedRoute requiredRole="customer"><CustomerLayout /></ProtectedRoute>}>
              <Route index element={<Suspense fallback={<PageLoader />}><HomePage /></Suspense>} />
              <Route path="orders" element={<Suspense fallback={<PageLoader />}><CustOrdersPage /></Suspense>} />
              <Route path="orders/:id" element={<Suspense fallback={<PageLoader />}><CustOrderDetailPage /></Suspense>} />
              <Route path="book" element={<Suspense fallback={<PageLoader />}><BookShipmentPage /></Suspense>} />
              <Route path="trips" element={<Suspense fallback={<PageLoader />}><CustTripsPage /></Suspense>} />
              <Route path="notifications" element={<Suspense fallback={<PageLoader />}><NotificationsPage /></Suspense>} />
              <Route path="profile" element={<Suspense fallback={<PageLoader />}><CustProfilePage /></Suspense>} />
              <Route path="personal-info" element={<Suspense fallback={<PageLoader />}><CustPersonalInfoPage /></Suspense>} />
              <Route path="support" element={<Suspense fallback={<PageLoader />}><SupportChatPage /></Suspense>} />
            </Route>

            {/* Admin — each child page loads on demand */}
            <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminLayout /></ProtectedRoute>}>
              <Route index element={<Suspense fallback={<PageLoader />}><DashboardPage /></Suspense>} />
              <Route path="orders" element={<Suspense fallback={<PageLoader />}><AdminOrdersPage /></Suspense>} />
              <Route path="orders/:id" element={<Suspense fallback={<PageLoader />}><AdminOrderDetailPage /></Suspense>} />
              <Route path="trips" element={<Suspense fallback={<PageLoader />}><AdminTripsPage /></Suspense>} />
              <Route path="trips/create" element={<Suspense fallback={<PageLoader />}><CreateTripPage /></Suspense>} />
              <Route path="trips/:id" element={<Suspense fallback={<PageLoader />}><TripDetailPage /></Suspense>} />
              <Route path="customers" element={<Suspense fallback={<PageLoader />}><CustomersPage /></Suspense>} />
              <Route path="customers/:id" element={<Suspense fallback={<PageLoader />}><CustomerDetailPage /></Suspense>} />
              <Route path="sales" element={<Suspense fallback={<PageLoader />}><SalesPage /></Suspense>} />
              <Route path="reports" element={<Suspense fallback={<PageLoader />}><ReportsPage /></Suspense>} />
              <Route path="announcements" element={<Suspense fallback={<PageLoader />}><AnnouncementsPage /></Suspense>} />
              <Route path="inbox" element={<Suspense fallback={<PageLoader />}><InboxPage /></Suspense>} />
              <Route path="settings" element={<Suspense fallback={<PageLoader />}><SettingsPage /></Suspense>} />
              <Route path="contact-inquiries" element={<Suspense fallback={<PageLoader />}><ContactInquiriesPage /></Suspense>} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
