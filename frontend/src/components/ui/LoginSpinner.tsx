import React from 'react';
import { motion } from 'framer-motion';
import { UserRole } from '../../types/user.types';

export interface LoginSpinnerProps {
  role?: UserRole;
}

const getRoleMessage = (role?: UserRole) => {
  switch (role) {
    case UserRole.OWNER:
      return "Authenticating Executive Credentials...";
    case UserRole.FINANCE_MANAGER:
    case UserRole.ACCOUNTANT:
      return "Verifying Financial Ledger Access...";
    case UserRole.DRIVER_MANAGER:
      return "Initializing Fleet Command Center...";
    case UserRole.DRIVER:
      return "Connecting Driver Telemetry System...";
    case UserRole.CS_MANAGER:
    case UserRole.CS_AGENT:
      return "Loading Customer Operations Desk...";
    default:
      return "Authenticating Workspace...";
  }
};

const getRoleColor = (role?: UserRole) => {
  switch (role) {
    case UserRole.OWNER:
      return { hex: '#f59e0b', textClass: 'text-amber-500' };
    case UserRole.FINANCE_MANAGER:
    case UserRole.ACCOUNTANT:
      return { hex: '#10b981', textClass: 'text-emerald-500' };
    case UserRole.DRIVER_MANAGER:
    case UserRole.DRIVER:
      return { hex: '#6366f1', textClass: 'text-indigo-500' };
    case UserRole.CS_MANAGER:
    case UserRole.CS_AGENT:
      return { hex: '#06b6d4', textClass: 'text-cyan-500' };
    default:
      return { hex: '#10b981', textClass: 'text-emerald-500' };
  }
};

export const LoginSpinner: React.FC<LoginSpinnerProps> = ({ role }) => {
  const roleColor = getRoleColor(role);
  const loadingMessage = getRoleMessage(role);

  return (
    <div className="flex flex-col items-center justify-center gap-6 p-8">
      <div className="relative flex h-24 w-24 items-center justify-center">
        {/* Outer Ring: Dashed border rotating counter-clockwise */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className="absolute h-full w-full rounded-full border-2 border-dashed border-slate-700/60"
        />

        {/* Middle Ring: Glowing gradient rotating clockwise */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className="absolute h-16 w-16 rounded-full border-[3px] border-transparent opacity-80"
          style={{ 
            borderTopColor: roleColor.hex,
            borderRightColor: roleColor.hex,
            boxShadow: `0 0 20px ${roleColor.hex}33` // 33 is 20% opacity in hex
          }}
        />

        {/* Inner Core: Pulsing light source */}
        <motion.div
          animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="h-6 w-6 rounded-full"
          style={{ 
            backgroundColor: roleColor.hex,
            boxShadow: `0 0 30px ${roleColor.hex}`
          }}
        />
      </div>

      {/* Pulsing Text */}
      <motion.p
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className={`text-sm font-semibold tracking-wider uppercase ${roleColor.textClass}`}
      >
        {loadingMessage}
      </motion.p>
    </div>
  );
};
