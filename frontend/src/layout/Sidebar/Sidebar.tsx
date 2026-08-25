import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "../../app/store";
import { logout } from "../../features/auth/authSlice";
import PresenceDot from "../../components/ui/PresenceDot";
import { connectSocket } from "../../features/chat/socket";
import { useLanguage } from "../../context/LanguageContext";
import { UserRole } from "../../types/user.types";
import { useUnreadMessages } from "../../hooks/useUnreadMessages";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Package,
  AlertTriangle,
  Building2,
  Users,
  Radio,
  MapPin,
  FileSpreadsheet,
  Receipt,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Headphones,
  MessageSquare,
  BrainCircuit,
} from "lucide-react";
import { ENABLE_RAG } from "../../constants/apiEndpoints";

interface NavItemConfig {
  to: string;
  label: string;
  description: string;
  icon: React.ElementType;
  end?: boolean;
  requiredRole?: string[];
}

const mainNavigationItems: NavItemConfig[] = [
  {
    to: "/dashboard",
    label: "Dashboard",
    description: "View analytics & metrics",
    icon: LayoutDashboard,
    end: true,
  },
  {
    to: "/shipments",
    label: "Shipments",
    description: "Track live deliveries",
    icon: Package,
  },
  // Incidents nav link appears ONLY for DRIVER
  {
    to: "/incidents",
    label: "Incidents",
    description: "Report & ground exception chat",
    icon: AlertTriangle,
    requiredRole: ["DRIVER", UserRole.DRIVER],
  },
];

export default function Sidebar() {
  const { user, token } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem("sidebarCollapsed") === "true";
  });

  const { unreadTotal } = useUnreadMessages();

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebarCollapsed", String(next));
      return next;
    });
  };

  useEffect(() => {
    if (token) {
      connectSocket(token);
    }
  }, [token]);

  const springConfig = { type: "spring", stiffness: 350, damping: 28 };

  const renderNavItem = (
    to: string,
    label: string,
    description: string,
    Icon: React.ElementType,
    end?: boolean,
    badgeText?: string,
    unreadCount?: number,
  ) => {
    return (
      <NavLink
        key={to}
        to={to}
        end={end}
        title={isCollapsed ? `${label} - ${description}` : undefined}
        className="relative flex items-center gap-3.5 rounded-xl px-3.5 py-3 transition-all duration-200 outline-none group mb-1"
      >
        {({ isActive }) => (
          <>
            {isActive && (
              <motion.div
                layoutId="sidebarActiveIndicator"
                transition={springConfig}
                className="absolute inset-0 rounded-xl bg-slate-800/80 border-l-4 border-[#2ec866] pointer-events-none shadow-sm"
              />
            )}

            <div
              className={`relative z-10 flex items-center justify-center h-5 w-5 flex-shrink-0 transition-colors ${
                isActive ? "text-[#2ec866]" : "text-slate-400 group-hover:text-white"
              }`}
            >
              <Icon size={20} />
            </div>

            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                className="relative z-10 flex flex-col min-w-0 flex-1 overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`font-semibold text-sm truncate transition-colors ${
                      isActive ? "text-white" : "text-slate-300 group-hover:text-white"
                    }`}
                  >
                    {label}
                  </span>
                  <div className="flex items-center gap-1">
                    {badgeText && (
                      <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[9px] font-black uppercase text-rose-400 border border-rose-500/30">
                        {badgeText}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-[11px] text-slate-400 truncate transition-colors">
                  {description}
                </span>
              </motion.div>
            )}

            {!isActive && (
              <div className="absolute inset-0 rounded-xl border-l-4 border-transparent bg-transparent transition-colors group-hover:bg-slate-800/40 pointer-events-none" />
            )}
          </>
        )}
      </NavLink>
    );
  };

  return (
    <motion.aside
      animate={{ width: isCollapsed ? 84 : 288 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="sticky top-0 z-40 flex h-screen flex-col border-r border-slate-800 bg-[#0f172a] px-3.5 py-6 flex-shrink-0 select-none"
    >
      <button
        onClick={toggleCollapse}
        className="absolute -right-3.5 top-7 flex h-7 w-7 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-slate-300 shadow-md transition hover:bg-slate-700 hover:text-white"
        title={isCollapsed ? "Expand Sidebar" : "Auto-hide / Collapse Sidebar"}
      >
        {isCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
      </button>

      {/* Header Section */}
      <div className="mb-6 px-1 flex items-center justify-between">
        {!isCollapsed ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.35em] text-[#2ec866]">
              Logicore
            </p>
            <h2 className="mt-1 text-xl font-extrabold text-white truncate">
              Operations Center
            </h2>
          </motion.div>
        ) : (
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[#2ec866]/20 border border-[#2ec866]/40 font-black text-[#2ec866]">
            LC
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden pr-0.5">
        {mainNavigationItems
          .filter((item) => {
            if (item.requiredRole) {
              return user && item.requiredRole.includes(user.role as string);
            }
            if (item.to === "/dashboard" && user?.role === UserRole.CS_MANAGER) {
              return false;
            }
            return true;
          })
          .map((item) => {
            // Pass unreadTotal to the Incidents link for DRIVER
            const isDriverIncidents = item.to === "/incidents" && user?.role === UserRole.DRIVER;
            return renderNavItem(item.to, item.label, item.description, item.icon, item.end, undefined, isDriverIncidents ? unreadTotal : undefined);
          })}

        {/* CS Chat Hub for CS_AGENT */}
        {user && ["CS_AGENT", UserRole.CS_AGENT].includes(user.role as string) &&
          renderNavItem("/dashboard/cs-chats", "Open Chats", "My conversations & queue", MessageSquare, false, undefined, unreadTotal)
        }

        {/* Dedicated CS Support Hub for CS_AGENT & CS_MANAGER */}
        {user && ["CS_AGENT", UserRole.CS_AGENT, "CS_MANAGER", UserRole.CS_MANAGER, "OWNER", UserRole.OWNER].includes(user.role as string) &&
          renderNavItem("/dashboard/cs-incidents", "CS Support Hub", "Live incident triage", Headphones)
        }

        {/* Dedicated Executive Escalation Workspace for Managers */}
        {user && ["CS_MANAGER", UserRole.CS_MANAGER].includes(user.role as string) && (
          <>
            {renderNavItem(
              "/dashboard/manager",
              "My Dashboard",
              "Notifications & queue",
              LayoutDashboard
            )}
            {renderNavItem("/dashboard/escalations", "Escalations", "3-way manager suite", ShieldAlert)}
          </>
        )}

        {user && [UserRole.OWNER, "ADMIN"].includes(user.role as string) &&
          renderNavItem("/dashboard/departments", t("sidebarDepartments") || "Departments", "Provisioning", Building2)
        }

        {ENABLE_RAG &&
          renderNavItem("/ai-assistant", "AI Assistant", "RAG-powered insights", BrainCircuit)
        }

        {user && ["FINANCE_MANAGER", "CS_MANAGER", "FLEET_MANAGER", "DRIVER_MANAGER"].includes(user.role as string) && user.departmentId &&
          renderNavItem(`/departments/${user.departmentId}`, "My Department", "Manage team", Users)
        }

        {user && ["OWNER", "FLEET_MANAGER", "DRIVER_MANAGER", "FINANCE_MANAGER", "FINANCE_AGENT"].includes(user.role as string) && (
          <>
            {renderNavItem("/dashboard/crisis", t("sidebarCrisisRooms") || "Crisis Rooms", "Live response", Radio)}
            {renderNavItem("/operations/map", "Live Tracking", "Fleet telemetry", MapPin)}
          </>
        )}

        {user && ["FINANCE_MANAGER", "FINANCE_AGENT", "ADMIN"].includes(user.role as string) && (
          <>
            {renderNavItem("/dashboard/accounting", "Bulk Ingest", "CSV imports", FileSpreadsheet)}
            {renderNavItem("/settlements/reconcile", "EOD Reconciliation", "Settle accounts", Receipt)}
          </>
        )}
      </nav>

      {/* User Presence Footer */}
      {user && (
        <div className="mt-auto border-t border-slate-800/80 pt-4 px-0.5">
          <div className={`flex items-center gap-3 rounded-xl bg-slate-800/50 p-2.5 ${isCollapsed ? "justify-center" : ""}`}>
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#2ec866]/20 text-sm font-black text-[#2ec866]">
              {user.userName?.charAt(0).toUpperCase() ?? "?"}
            </div>

            {!isCollapsed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-white">{user.userName}</p>
                <p className="truncate text-[10px] text-slate-400 capitalize">{user.role?.toLowerCase().replace(/_/g, " ")}</p>
              </motion.div>
            )}

            {!isCollapsed && <PresenceDot userId={user.id} initialOnline showLabel size="sm" />}

            <button
              onClick={() => {
                dispatch(logout());
                navigate("/login");
              }}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-700/60 hover:text-rose-400 transition-colors"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      )}
    </motion.aside>
  );
}
