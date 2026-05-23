import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import AdminLayout from './components/layout/AdminLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Deliveries from './pages/Deliveries';
import UsersPage from './pages/Users';
import Motoboys from './pages/Motoboys';
import Drivers from './pages/Drivers';
import Transactions from './pages/Transactions';
import Recharges from './pages/Recharges';
import Pricing from './pages/Pricing';
import LiveMap from './pages/LiveMap';
import DocumentReviews from './pages/DocumentReviews';
import LandingLeads from './pages/LandingLeads';
import Settings from './pages/Settings';
import { PageSpinner } from './components/ui/Spinner';
import './design/global.css';
import './components/ui/Button.css';

function ProtectedRoute({ children }) {
  const { user, profile, loading } = useAuth();

  if (loading) return <PageSpinner />;
  if (!user || !profile || profile.role !== 'admin') {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function PublicRoute({ children }) {
  const { user, profile, loading } = useAuth();

  if (loading) return <PageSpinner />;
  if (user && profile?.role === 'admin') {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />

          {/* Protected — Admin Layout */}
          <Route
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="deliveries" element={<Deliveries />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="motoboys" element={<Motoboys />} />
            <Route path="drivers/:category" element={<Drivers />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="recharges" element={<Recharges />} />
            <Route path="pricing" element={<Pricing />} />
            <Route path="map" element={<LiveMap />} />
            <Route path="documents" element={<DocumentReviews />} />
            <Route path="landing-leads" element={<LandingLeads />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
