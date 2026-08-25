import React, { useState } from 'react';
import type { Employee, DepartmentType } from '../types';
import { CheckCircle, XCircle, Shield } from 'lucide-react';
import { ChangeRoleModal } from './ChangeRoleModal';

interface Props {
  employees: Employee[];
  departmentType: DepartmentType;
  onToggleStatus: (userId: string, currentStatus: boolean) => Promise<void>;
  onChangeRole: (userId: string, newRole: string) => Promise<void>;
}

export const EmployeesTable: React.FC<Props> = ({ employees, departmentType, onToggleStatus, onChangeRole }) => {
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: string; role: string } | null>(null);

  const handleRoleChangeSubmit = async (newRole: string) => {
    if (selectedUser) {
      await onChangeRole(selectedUser.id, newRole);
    }
  };

  return (
    <>
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
              <tr>
                <th className="px-6 py-3">Employee</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No employees found in this department.
                  </td>
                </tr>
              ) : (
                employees.map((employee) => (
                  <tr key={employee._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{employee.userName}</div>
                      <div className="text-gray-500 text-xs">{employee.email}</div>
                      {employee.phone && <div className="text-gray-400 text-xs">{employee.phone}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        {employee.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {employee.isActive ? (
                        <span className="inline-flex items-center text-emerald-600 text-xs font-medium">
                          <CheckCircle className="w-4 h-4 mr-1" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-red-600 text-xs font-medium">
                          <XCircle className="w-4 h-4 mr-1" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => onToggleStatus(employee._id, employee.isActive)}
                        className="text-gray-400 hover:text-emerald-600 transition-colors"
                        title={employee.isActive ? "Deactivate" : "Activate"}
                      >
                        {employee.isActive ? <XCircle className="w-5 h-5 inline" /> : <CheckCircle className="w-5 h-5 inline" />}
                      </button>
                      <button
                        onClick={() => {
                          setSelectedUser({ id: employee._id, role: employee.role });
                          setRoleModalOpen(true);
                        }}
                        className="text-gray-400 hover:text-blue-600 transition-colors"
                        title="Change Role"
                      >
                        <Shield className="w-5 h-5 inline" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedUser && (
        <ChangeRoleModal
          isOpen={roleModalOpen}
          onClose={() => {
            setRoleModalOpen(false);
            setSelectedUser(null);
          }}
          departmentType={departmentType}
          currentRole={selectedUser.role}
          onSubmit={handleRoleChangeSubmit}
        />
      )}
    </>
  );
};
