import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { DepartmentType } from '../types';
import { UserRole } from '../../../types/user.types';

const getRolesForDepartment = (type: DepartmentType) => {
  switch (type) {
    case "FINANCE":
      return [UserRole.ACCOUNTANT];
    case "CS":
      return [UserRole.CS_AGENT];
    case "OPERATIONS":
      return [UserRole.DRIVER];
    default:
      return [];
  }
};

/** Human-readable labels for roles in select dropdowns */
const ROLE_LABELS: Record<string, string> = {
  [UserRole.FINANCE_MANAGER]: "Finance Manager",
  [UserRole.ACCOUNTANT]: "Accountant",
  [UserRole.CS_MANAGER]: "CS Manager",
  [UserRole.CS_AGENT]: "CS Agent",
  [UserRole.DRIVER_MANAGER]: "Driver Manager",
  [UserRole.DRIVER]: "Driver",
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  departmentType: DepartmentType;
  onSubmit: (data: any) => Promise<void>;
}

export const CreateEmployeeModal: React.FC<Props> = ({ isOpen, onClose, departmentType, onSubmit }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roles = getRolesForDepartment(departmentType);

  // Fallback if no roles available
  const schemaRoles = roles.length > 0 ? (roles as [string, ...string[]]) : ["NONE" as string, ...[]] as [string, ...string[]];

  const schema = z.object({
    userName: z.string().min(3, "Name must be at least 3 characters").max(50),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    phone: z.string().regex(/^[0-9]+$/, "Phone must contain only numbers").optional().or(z.literal('')),
    role: z.enum(schemaRoles),
  });

  type FormData = z.infer<typeof schema>;

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: roles[0] || "NONE" }
  });

  const handleFormSubmit = async (data: FormData) => {
    try {
      setLoading(true);
      setError(null);
      await onSubmit(data);
      reset();
      onClose();
    } catch (err: any) {
      const respData = err.response?.data || err;
      if (respData?.errors && Array.isArray(respData.errors)) {
        setError(respData.errors.map((e: any) => e.message).join(', '));
      } else {
        setError(respData?.message || err.message || "An error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6" dir="ltr">
        <h2 className="text-xl font-bold mb-4">Create Employee</h2>
        
        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>}

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">User Name</label>
            <input 
              {...register('userName')} 
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {errors.userName && <p className="text-red-500 text-xs mt-1">{errors.userName.message as string}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input 
              {...register('email')} 
              type="email"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message as string}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input 
              {...register('password')} 
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message as string}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input 
              {...register('phone')} 
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message as string}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select 
              {...register('role')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {roles.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r] ?? r}</option>
              ))}
            </select>
            {errors.role && <p className="text-red-500 text-xs mt-1">{errors.role.message as string}</p>}
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
              disabled={loading || roles.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
