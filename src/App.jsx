import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import PrivateRoute from './components/PrivateRoute';
import MainLayout from './components/layout/MainLayout';

/**
 * Route-level code splitting.
 *
 * Login and the dashboard are the only screens a cold visit needs, so they stay
 * in the entry chunk. Everything else — and critically everything that drags in
 * Leaflet (GIS map), the telemetry charts, or the heavier forms — loads on
 * navigation. The map module is split again inside Dashboard so the KPI strip
 * paints before Leaflet arrives.
 */
import Login     from './pages/Login';
import Dashboard from './pages/Dashboard';

const Register        = lazy(() => import('./pages/Register'));
const BridgesList     = lazy(() => import('./pages/BridgesList'));
const BridgeForm      = lazy(() => import('./pages/BridgeForm'));
const BridgeDetails   = lazy(() => import('./pages/BridgeDetails'));
const InspectionForm  = lazy(() => import('./pages/InspectionForm'));
const InspectionsList = lazy(() => import('./pages/InspectionsList'));
const Maintenance     = lazy(() => import('./pages/Maintenance'));
const SensorAnalytics = lazy(() => import('./pages/SensorAnalytics'));
const HealthAlerts    = lazy(() => import('./pages/HealthAlerts'));
const SystemLogs      = lazy(() => import('./pages/SystemLogs'));
const Users           = lazy(() => import('./pages/Users'));
const MapView         = lazy(() => import('./pages/MapView'));

/* Shown only while a route chunk is in flight — deliberately quiet so a fast
   connection never flashes a spinner. */
function RouteFallback() {
  return (
    <div className="route-loading">
      <div className="spinner" />
      <span>Loading module…</span>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <NotificationProvider>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                {/* Public */}
                <Route path="/login"    element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Protected */}
                <Route
                  element={
                    <PrivateRoute>
                      <MainLayout />
                    </PrivateRoute>
                  }
                >
                  <Route index element={<Navigate to="/dashboard" replace />} />

                  {/* Operations */}
                  <Route path="/dashboard"    element={<Dashboard />} />
                  <Route path="/bridges"      element={<BridgesList />} />
                  <Route path="/bridges/new"  element={<BridgeForm />} />
                  <Route path="/bridges/:id"  element={<BridgeDetails />} />
                  <Route path="/bridges/:id/edit" element={<BridgeForm />} />
                  <Route path="/bridges/:bridgeId/inspections/new"                element={<InspectionForm />} />
                  <Route path="/bridges/:bridgeId/inspections/:inspectionId/edit" element={<InspectionForm />} />
                  <Route path="/inspections"  element={<InspectionsList />} />
                  <Route path="/maintenance"  element={<Maintenance />} />

                  {/* Monitoring */}
                  <Route path="/sensors" element={<SensorAnalytics />} />
                  <Route path="/alerts"  element={<HealthAlerts />} />
                  <Route path="/map"     element={<MapView />} />

                  {/* Administration */}
                  <Route path="/logs" element={<SystemLogs />} />
                  <Route
                    path="/users"
                    element={
                      <PrivateRoute adminOnly>
                        <Users />
                      </PrivateRoute>
                    }
                  />
                </Route>

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Suspense>
          </NotificationProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
