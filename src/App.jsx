import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import PrivateRoute from './components/PrivateRoute';
import MainLayout from './components/layout/MainLayout';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import BridgesList from './pages/BridgesList';
import BridgeForm from './pages/BridgeForm';
import BridgeDetails from './pages/BridgeDetails';
import InspectionForm from './pages/InspectionForm';
import InspectionsList from './pages/InspectionsList';
import Users from './pages/Users';

export default function App() {
  return (
    <ThemeProvider>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />
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
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/bridges" element={<BridgesList />} />
            <Route path="/bridges/new" element={<BridgeForm />} />
            <Route path="/bridges/:id" element={<BridgeDetails />} />
            <Route path="/bridges/:id/edit" element={<BridgeForm />} />
            <Route path="/bridges/:bridgeId/inspections/new" element={<InspectionForm />} />
            <Route path="/bridges/:bridgeId/inspections/:inspectionId/edit" element={<InspectionForm />} />
            <Route path="/inspections" element={<InspectionsList />} />
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
      </AuthProvider>
    </BrowserRouter>
    </ThemeProvider>
  );
}
