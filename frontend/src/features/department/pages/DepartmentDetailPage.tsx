import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../app/store';
import { fetchDepartment, fetchDepartmentEmployees, createEmployee, updateEmployeeStatus, updateEmployeeRole, clearSelectedDepartment } from '../departmentSlice';
import { EmployeesTable } from '../components/EmployeesTable';
import { CreateEmployeeModal } from '../components/CreateEmployeeModal';
import { Users, Plus } from 'lucide-react';
import type { CreateEmployeePayload } from '../types';

export const DepartmentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const { selectedDepartment, selectedDepartmentEmployees, loading, error } = useSelector((state: RootState) => state.departments);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  useEffect(() => {
    if (id) {
      dispatch(fetchDepartment(id));
      dispatch(fetchDepartmentEmployees(id));
    }
    return () => {
      dispatch(clearSelectedDepartment());
    };
  }, [id, dispatch]);

  const handleCreateEmployee = async (data: CreateEmployeePayload) => {
    if (id) {
      await dispatch(createEmployee({ id, data })).unwrap();
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    if (id) {
      await dispatch(updateEmployeeStatus({ id, userId, isActive: !currentStatus })).unwrap();
    }
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    if (id) {
      await dispatch(updateEmployeeRole({ id, userId, role: newRole })).unwrap();
    }
  };

  if (loading && !selectedDepartment) {
    return <div className="p-6 text-center text-gray-500">Loading department details...</div>;
  }

  if (error || !selectedDepartment) {
    return <div className="p-6 text-center text-red-500">{error || "Department not found"}</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-lg shadow">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{selectedDepartment.name}</h1>
          <p className="text-gray-500 text-sm mt-1">{selectedDepartment.description || 'No description provided'}</p>
          <div className="flex gap-4 mt-3">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              Type: {selectedDepartment.type}
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              Location: {selectedDepartment.location}
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Employees: {selectedDepartmentEmployees.length} / {selectedDepartment.maxEmployees}
            </span>
          </div>
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          disabled={selectedDepartment.status !== "ACTIVE" || selectedDepartmentEmployees.length >= selectedDepartment.maxEmployees}
          className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors disabled:opacity-50"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Employee
        </button>
      </div>

      {selectedDepartment.status !== "ACTIVE" && (
        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-md">
          <p className="text-amber-700 text-sm">
            This department is not active yet. Employees cannot be managed until a manager is assigned and the department is activated.
          </p>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <Users className="w-5 h-5 mr-2 text-gray-500" />
          Directory
        </h2>
        <EmployeesTable
          employees={selectedDepartmentEmployees}
          departmentType={selectedDepartment.type}
          onToggleStatus={handleToggleStatus}
          onChangeRole={handleChangeRole}
        />
      </div>

      <CreateEmployeeModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        departmentType={selectedDepartment.type}
        onSubmit={handleCreateEmployee}
      />
    </div>
  );
};
