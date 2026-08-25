import React from 'react';
import type { DepartmentStatus } from '../types';

interface Props {
  status: DepartmentStatus;
}

export const DepartmentStatusBadge: React.FC<Props> = ({ status }) => {
  const getBadgeStyle = () => {
    switch (status) {
      case 'ACTIVE': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'CREATED': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'INACTIVE': return 'bg-slate-100 text-slate-800 border-slate-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getBadgeStyle()}`}>
      {status}
    </span>
  );
};
