import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import type { RootState } from '../../app/store';

export const ManagerWorkspace: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);

  // If the user has a department ID, redirect them to their department page
  if (user?.departmentId) {
    return <Navigate to={`/departments/${user.departmentId}`} replace />;
  }

  return (
    <div className="p-6 text-center text-gray-500">
      <h2 className="text-xl font-semibold mb-2">No Department Assigned</h2>
      <p>You have not been assigned to a department yet. Please contact your administrator.</p>
    </div>
  );
};
