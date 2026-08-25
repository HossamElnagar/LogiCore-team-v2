import { useSelector } from "react-redux";
import { Navigate, Outlet } from "react-router-dom";
import type { RootState } from "../app/store";
import { UserRole } from "../types/user.types";

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export const getDefaultRouteForRole = (role?: UserRole): string => {
  switch (role) {
    case UserRole.DRIVER:
      return "/operations/map";
    case UserRole.FINANCE_MANAGER:
    case UserRole.ACCOUNTANT:
      return "/dashboard/accounting";
    case UserRole.CS_MANAGER:
    case UserRole.CS_AGENT:
      return "/dashboard/cs";
    case UserRole.DRIVER_MANAGER:
      return "/dashboard/fleet";
    case UserRole.OWNER:
      return "/dashboard";
    default:
      return "/login";
  }
};

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
/**/
console.log("------------------AUTH DEBUG:---------------", {
  isAuthenticated,
  userRole: user?.role,
  expectedRole: UserRole.CS_MANAGER,
  allowedRoles,
  isAllowed: user
    ? allowedRoles?.includes(user.role as UserRole)
    : false,
});
/**/

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }
console.log("🔍 PROTECTED ROUTE DEBUG:", {
  path: window.location.pathname,
  userRole: user?.role,
  allowedRoles,
  isAllowed: allowedRoles
    ? allowedRoles.includes(user?.role as UserRole)
    : true,
});//000000000000000000000000
  // Block users from manually typing a URL they don't have access to
  if (allowedRoles && !allowedRoles.includes(user.role as UserRole)) {
    return <Navigate to={getDefaultRouteForRole(user.role as UserRole)} replace />;
  }

  return <Outlet />;
}
