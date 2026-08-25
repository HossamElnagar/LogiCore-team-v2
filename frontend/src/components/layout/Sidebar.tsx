import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Package,
  Building2,
  MessageSquare,
  Radio,
  LogOut,
  ChevronLeft,
  Wallet,
  Receipt,
  Users
} from 'lucide-react';
import { UserRole } from '../../types/user.types';

export interface SidebarProps {
  userRole: UserRole;
  userName: string;
  onLogout?: () => void;
}

interface NavItem {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  allowedRoles: UserRole[];
  path: string;
}

const navItems: NavItem[] = [
  { 
    id: 'dashboard', 
    label: 'Dashboard', 
    description: 'Overview & Analytics', 
    icon: LayoutDashboard,
    allowedRoles: [UserRole.OWNER, UserRole.FINANCE_MANAGER, UserRole.DRIVER_MANAGER, UserRole.CS_MANAGER],
    path: '/dashboard'
  },
  { 
    id: 'financials', 
    label: 'Financials', 
    description: 'Revenue & P&L', 
    icon: Wallet,
    allowedRoles: [UserRole.OWNER, UserRole.FINANCE_MANAGER, UserRole.ACCOUNTANT],
    path: '/dashboard/accounting'
  },
  { 
    id: 'invoices', 
    label: 'Invoices', 
    description: 'Billing & Payments', 
    icon: Receipt,
    allowedRoles: [UserRole.OWNER, UserRole.FINANCE_MANAGER, UserRole.ACCOUNTANT],
    path: '/settlements/reconcile'
  },
  { 
    id: 'shipments', 
    label: 'Shipments', 
    description: 'Active & History', 
    icon: Package,
    allowedRoles: [UserRole.OWNER, UserRole.CS_MANAGER, UserRole.CS_AGENT, UserRole.DRIVER_MANAGER, UserRole.FINANCE_MANAGER, UserRole.ACCOUNTANT],
    path: '/shipments'
  },
  { 
    id: 'fleet', 
    label: 'Fleet & Drivers', 
    description: 'Manage Vehicles', 
    icon: Building2,
    allowedRoles: [UserRole.OWNER, UserRole.DRIVER_MANAGER],
    path: '/dashboard/fleet'
  },
  { 
    id: 'tracking', 
    label: 'Live Tracking', 
    description: 'Telemetry & Maps', 
    icon: Radio,
    allowedRoles: [UserRole.OWNER, UserRole.DRIVER_MANAGER, UserRole.CS_MANAGER, UserRole.CS_AGENT, UserRole.DRIVER],
    path: '/operations/map'
  },
  { 
    id: 'customers', 
    label: 'Customers', 
    description: 'Accounts & Support', 
    icon: Users,
    allowedRoles: [UserRole.OWNER, UserRole.CS_MANAGER, UserRole.CS_AGENT],
    path: '/dashboard/cs'
  },
  { 
    id: 'comms', 
    label: 'Comms', 
    description: 'Driver Chat', 
    icon: MessageSquare,
    allowedRoles: [UserRole.OWNER, UserRole.DRIVER_MANAGER, UserRole.CS_MANAGER, UserRole.CS_AGENT, UserRole.DRIVER],
    path: '/dashboard/crisis'
  },
];

const getRoleTheme = (role: UserRole) => {
  switch (role) {
    case UserRole.OWNER:
      return { 
        bg: 'bg-amber-500', bgLight: 'bg-amber-500/10', 
        text: 'text-amber-500', hoverText: 'group-hover:text-amber-500', 
        border: 'border-amber-500/20', glow: 'shadow-amber-500/20' 
      };
    case UserRole.FINANCE_MANAGER:
    case UserRole.ACCOUNTANT:
      return { 
        bg: 'bg-emerald-500', bgLight: 'bg-emerald-500/10', 
        text: 'text-emerald-500', hoverText: 'group-hover:text-emerald-500', 
        border: 'border-emerald-500/20', glow: 'shadow-emerald-500/20' 
      };
    case UserRole.DRIVER:
    case UserRole.DRIVER_MANAGER:
      return { 
        bg: 'bg-indigo-500', bgLight: 'bg-indigo-500/10', 
        text: 'text-indigo-500', hoverText: 'group-hover:text-indigo-500', 
        border: 'border-indigo-500/20', glow: 'shadow-indigo-500/20' 
      };
    case UserRole.CS_MANAGER:
    case UserRole.CS_AGENT:
      return { 
        bg: 'bg-cyan-500', bgLight: 'bg-cyan-500/10', 
        text: 'text-cyan-500', hoverText: 'group-hover:text-cyan-500', 
        border: 'border-cyan-500/20', glow: 'shadow-cyan-500/20' 
      };
    default:
      return { 
        bg: 'bg-slate-500', bgLight: 'bg-slate-500/10', 
        text: 'text-slate-500', hoverText: 'group-hover:text-slate-500', 
        border: 'border-slate-500/20', glow: 'shadow-slate-500/20' 
      };
  }
};

const getInitials = (name: string) => {
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
};

const formatRole = (role: string) => {
  return role.replace('_', ' ');
};

export const Sidebar: React.FC<SidebarProps> = ({ userRole, userName, onLogout }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Filter allowed navigation items based on UserRole
  const filteredNavItems = navItems.filter(item => item.allowedRoles.includes(userRole));
  
  // Dynamically sync active tab with the current route path
  const activeItem = filteredNavItems.find(item => {
    if (item.path === '/dashboard' && location.pathname !== '/dashboard') {
      return false;
    }
    return location.pathname.startsWith(item.path);
  });
  const activeTab = activeItem ? activeItem.id : (filteredNavItems.length > 0 ? filteredNavItems[0].id : '');

  const springConfig = { type: 'spring', stiffness: 350, damping: 28 };
  const roleTheme = getRoleTheme(userRole);

  const handleNavClick = (path: string) => {
    navigate(path);
  };

  return (
    <motion.aside
      animate={{ width: isCollapsed ? 80 : 280 }}
      transition={springConfig}
      className="relative flex flex-col h-screen bg-[#0b1120] text-slate-300 border-r border-slate-800 shadow-2xl overflow-visible"
    >
      {/* ── Toggle Button ── */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-8 flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-white transition-colors z-50 focus:outline-none focus:ring-2 focus:ring-slate-500/50"
      >
        <motion.div animate={{ rotate: isCollapsed ? 180 : 0 }} transition={springConfig}>
          <ChevronLeft className="h-4 w-4" />
        </motion.div>
      </button>

      {/* ── Header ── */}
      <div className="flex items-center h-20 px-6 border-b border-slate-800/50 flex-shrink-0">
        <div className="flex items-center gap-3 overflow-hidden whitespace-nowrap w-full">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${roleTheme.bgLight} ${roleTheme.text} flex-shrink-0 border ${roleTheme.border}`}>
            <Radio className="h-5 w-5" />
          </div>
          <AnimatePresence initial={false} mode="wait">
            {!isCollapsed && (
              <motion.div
                key="header-text"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col"
              >
                <span className={`text-xs font-bold uppercase tracking-widest ${roleTheme.text}`}>LOGICORE</span>
                <span className="text-sm font-semibold text-slate-200">Operations Center</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-6 px-3 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        <div className="space-y-2">
          {filteredNavItems.map((item) => {
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.path)}
                className="relative flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left focus:outline-none outline-none group"
              >
                {/* Active Indicator Background */}
                {isActive && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    transition={springConfig}
                    className="absolute inset-0 rounded-xl bg-[#0f172a] border border-slate-700/50"
                  >
                    <div className={`absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full ${roleTheme.bg}`} />
                  </motion.div>
                )}

                <motion.div
                  whileHover={!isActive ? { x: 6 } : {}}
                  transition={springConfig}
                  className="relative z-10 flex items-center gap-4 w-full overflow-hidden"
                >
                  {/* Icon */}
                  <motion.div
                    whileHover={!isActive ? { scale: 1.1 } : {}}
                    className={`flex items-center justify-center transition-colors duration-200 ${isActive ? roleTheme.text : `text-slate-400 ${roleTheme.hoverText}`}`}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                  </motion.div>

                  {/* Text Content */}
                  <AnimatePresence initial={false}>
                    {!isCollapsed && (
                      <motion.div
                        key="nav-text"
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex flex-col overflow-hidden whitespace-nowrap"
                      >
                        <span className={`text-sm font-medium ${isActive ? 'text-white drop-shadow-md' : 'text-slate-300'}`}>
                          {item.label}
                        </span>
                        <span className={`text-[10px] uppercase tracking-wider ${isActive ? `${roleTheme.text} opacity-80` : 'text-slate-500'}`}>
                          {item.description}
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── User Profile ── */}
      <div className="border-t border-slate-800/50 p-4">
        <div className="flex items-center gap-3 overflow-hidden whitespace-nowrap rounded-xl bg-slate-900/50 p-2 hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700/50 cursor-pointer">
          <div className={`relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${roleTheme.bg} text-white font-bold shadow-lg ${roleTheme.glow}`}>
            {getInitials(userName)}
            <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ${roleTheme.bg} border-2 border-[#0b1120]`}></span>
          </div>
          
          <AnimatePresence initial={false}>
            {!isCollapsed && (
              <motion.div
                key="user-text"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: '100%' }}
                exit={{ opacity: 0, width: 0 }}
                className="flex items-center justify-between overflow-hidden"
              >
                <div className="flex flex-col flex-1 truncate pr-2">
                  <span className="text-sm font-bold text-white truncate">{userName}</span>
                  <span className="text-[10px] font-semibold text-slate-400 truncate">{formatRole(userRole)}</span>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onLogout) onLogout();
                  }}
                  className="text-slate-500 hover:text-rose-400 transition-colors p-2 rounded-lg hover:bg-rose-500/10 flex-shrink-0"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  );
};
