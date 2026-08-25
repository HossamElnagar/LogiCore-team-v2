import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { CreateDepartmentPayload } from '../types';
import { useLanguage } from '../../../context/LanguageContext';

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  type: z.enum(["OPERATIONS", "CS", "FINANCE"]),
  location: z.string().min(2, "Location must be at least 2 characters").max(200),
});

type FormData = z.infer<typeof schema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateDepartmentPayload) => Promise<void>;
}

export const CreateDepartmentModal: React.FC<Props> = ({ isOpen, onClose, onSubmit }) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: "OPERATIONS", location: "" }
  });

  const handleFormSubmit = async (data: FormData) => {
    try {
      setLoading(true);
      setError(null);
    
      await onSubmit({ 
        ...data, 
        managerId: undefined, 
        managerData: undefined 
      });
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
        <h2 className="text-xl font-bold mb-4">{t('departments_create') || 'Create Department'}</h2>
        
        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>}

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* 1. حقل الاسم */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input 
              {...register('name')} 
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="e.g. Cairo Fleet"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>

     
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select 
              {...register('type')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="OPERATIONS">Operations</option>
              <option value="CS">Customer Service</option>
              <option value="FINANCE">Finance</option>
            </select>
            {errors.type && <p className="text-red-500 text-xs mt-1">{errors.type.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input 
              {...register('location')} 
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="e.g. Giza, Egypt"
            />
            {errors.location && <p className="text-red-500 text-xs mt-1">{errors.location.message}</p>}
          </div>

         
          <div className="flex justify-end space-x-3 pt-4">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              {t('common_cancel') || 'Cancel'}
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : t('common_save') || 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};