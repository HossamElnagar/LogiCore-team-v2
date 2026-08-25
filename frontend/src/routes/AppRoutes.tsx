import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import RegisterPage from "../features/auth/pages/RegisterPage";
import LoginPage from "../features/auth/pages/LoginPage";
import RAGTestPage from "../pages/RAGTestPage";
import { ENABLE_RAG } from "../constants/apiEndpoints";
import Dashboard from "../pages/Dashboard";
import ShipmentsPage from "../features/shipment/pages/ShipmentsPage";
import ShipmentDetailsPage from "../features/shipment/pages/ShipmentDetailsPage";
import IncidentsPage from "../features/incident/pages/IncidentsPage";
import IncidentDetailsPage from "../features/incident/pages/IncidentDetailsPage";
import CSIncidentHub from "../features/incident/pages/CSIncidentHub";
import CSChatHub from "../features/incident/pages/CSChatHub";
import ManagerEscalationWorkspace from "../features/incident/pages/ManagerEscalationWorkspace";
import ManagerDashboardPage from "../features/incident/pages/ManagerDashboardPage";
import DriverReconciliationPage from "../features/shipment/pages/DriverReconciliationPage";
import LiveTrackingPage from "../features/shipment/pages/LiveTrackingPage";
import { DepartmentDetailPage } from "../features/department/pages/DepartmentDetailPage";
import DashbordLayout from "../layout/DashbordLayout";
import ProtectedRoute, { getDefaultRouteForRole } from "./ProtectedRoute";
import { UserRole } from "../types/user.types";
import { useSelector } from "react-redux";
import type { RootState } from "../app/store";

function RootRedirect() {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Automatically redirect authenticated users to their specific landing page
  return <Navigate to={getDefaultRouteForRole(user.role as UserRole)} replace />;
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<DashbordLayout />}>
            <Route element={<ProtectedRoute allowedRoles={[UserRole.OWNER, UserRole.CS_MANAGER, UserRole.DRIVER_MANAGER]} />}>
              <Route path="/dashboard/manager" element={<ManagerDashboardPage />} />
            </Route>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/cs" element={<Dashboard />} />
            <Route path="/dashboard/cs-incidents" element={<CSIncidentHub />} />
            <Route path="/dashboard/cs-chats" element={<CSChatHub />} />
            <Route path="/dashboard/escalations" element={<ManagerEscalationWorkspace />} />
            <Route path="/dashboard/owner" element={<Dashboard />} />
            <Route path="/dashboard/accounting" element={<Dashboard />} />
            <Route path="/dashboard/tracking" element={<Dashboard />} />
            <Route path="/dashboard/fleet" element={<Dashboard />} />
            <Route path="/dashboard/departments" element={<Dashboard />} />
            <Route path="/dashboard/crisis" element={<Dashboard />} />
            <Route path="/departments/:id" element={<DepartmentDetailPage />} />
            <Route path="/shipments" element={<ShipmentsPage />} />
            <Route path="/shipments/:id" element={<ShipmentDetailsPage />} />
            <Route path="/shipments/preview" element={<ShipmentDetailsPage />} />
            <Route path="/incidents" element={<IncidentsPage />} />
            <Route path="/incidents/:id" element={<IncidentDetailsPage />} />
            
            {/* EOD Reconciliation Route Guard */}
            <Route element={<ProtectedRoute allowedRoles={[UserRole.FINANCE_MANAGER, UserRole.ACCOUNTANT, UserRole.OWNER]} />}>
              <Route path="/settlements/reconcile" element={<DriverReconciliationPage />} />
            </Route>

            <Route path="/operations/map" element={<LiveTrackingPage />} />
            {ENABLE_RAG && <Route path="/ai-assistant" element={<RAGTestPage />} />}
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}