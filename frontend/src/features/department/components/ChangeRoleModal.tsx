import React, { useState } from 'react';
import type { DepartmentType } from '../types';
import { UserRole } from "../../../types/user.types";

const getRolesForDepartment = (type: DepartmentType): UserRole[] => {
  switch (type) {
    case "FINANCE": 
      return [UserRole.ACCOUNTANT, UserRole.FINANCE_MANAGER];
    case "CS": 
      return [UserRole.CS_AGENT, UserRole.CS_MANAGER];
    case "OPERATIONS": 
      return [UserRole.DRIVER, UserRole.DRIVER_MANAGER];
    default: 
      return [];
  }
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  departmentType: DepartmentType;
  currentRole: string;
  onSubmit: (role: string) => Promise<void>;
}

export const ChangeRoleModal: React.FC<Props> = ({ isOpen, onClose, departmentType, currentRole, onSubmit }) => {
  const [role, setRole] = useState(currentRole);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roles = getRolesForDepartment(departmentType);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      await onSubmit(role);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6" dir="ltr">
        <h2 className="text-xl font-bold mb-4">Change Role</h2>
        
        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Role</label>
            <select 
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {roles.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading || role === currentRole}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
