import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";
import { useDispatch, useSelector } from "react-redux";
import { fetchDepartments, createDepartment, assignManager, deleteDepartment } from "../../features/department/departmentSlice";
import { Trash2 } from "lucide-react";
import { CreateDepartmentModal } from "../../features/department/components/CreateDepartmentModal";
import { AssignManagerModal } from "../../features/department/components/AssignManagerModal";
import { DepartmentStatusBadge } from "../../features/department/components/DepartmentStatusBadge";
import type { Department, CreateDepartmentPayload, AssignManagerPayload } from "../../features/department/types";

export function DepartmentsManagementPanel() {
  const { t, dir } = useLanguage();
  const dispatch = useDispatch<any>();
  const navigate = useNavigate();
  
  const { departments, loading } = useSelector((state: any) => state.departments);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [assignManagerDept, setAssignManagerDept] = useState<Department | null>(null);

  useEffect(() => {
    dispatch(fetchDepartments());
  }, [dispatch]);

  const summary = useMemo(() => ({
    active: departments.filter((item: Department) => item.status === "ACTIVE").length,
    initializing: departments.filter((item: Department) => item.status === "CREATED").length,
  }), [departments]);

  const handleCreateSubmit = async (data: CreateDepartmentPayload) => {
    await dispatch(createDepartment(data)).unwrap();
    dispatch(fetchDepartments());
  };

  const handleAssignManager = async (departmentId: string, data: AssignManagerPayload) => {
    await dispatch(assignManager({ id: departmentId, data })).unwrap();
    dispatch(fetchDepartments());
  };

  const handleDeleteDepartment = async (e: React.MouseEvent, departmentId: string) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this department?")) {
      await dispatch(deleteDepartment(departmentId)).unwrap();
    }
  };

  return (
    <div className="space-y-6" dir={dir}>
      <header className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-sm flex justify-between items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-sky-600">{t("departmentsManagementTitle")}</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-900">{t("departmentsManagementSubtitle")}</h2>
        </div>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"
        >
          {t("departmentCreateButton")}
        </button>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-semibold text-slate-500">{t("departmentsActiveCount")}</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">{summary.active}</div>
        </div>
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-semibold text-slate-500">{t("departmentsInitializingCount")}</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">{summary.initializing}</div>
        </div>
      </div>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="overflow-hidden rounded-[1.25rem] border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.25em] text-slate-500">
              <tr>
                <th className="px-4 py-3">{t("departmentTableName")}</th>
                <th className="px-4 py-3">{t("departmentTableType")}</th>
                <th className="px-4 py-3">{t("departmentTableManager")}</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Employees</th>
                <th className="px-4 py-3">{t("departmentTableStatus")}</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
              {loading && departments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">Loading...</td>
                </tr>
              ) : departments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">No departments found.</td>
                </tr>
              ) : departments.map((department: Department) => (
                <tr 
                  key={department._id} 
                  onClick={() => navigate(`/departments/${department._id}`)}
                  className="cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <td className="px-4 py-3 font-semibold">{department.name}</td>
                  <td className="px-4 py-3">{department.type}</td>
                  <td className="px-4 py-3">{department.managerName || '-'}</td>
                  <td className="px-4 py-3">{department.location}</td>
                  <td className="px-4 py-3">{department.employeeCount || 0}</td>
                  <td className="px-4 py-3">
                    <DepartmentStatusBadge status={department.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {!department.managerId && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setAssignManagerDept(department);
                          }}
                          className="text-xs font-semibold text-sky-600 hover:text-sky-800"
                        >
                          Assign Manager
                        </button>
                      )}
                      <button
                        onClick={(e) => handleDeleteDepartment(e, department._id)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                        title="Delete Department"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <CreateDepartmentModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        onSubmit={handleCreateSubmit} 
      />

      <AssignManagerModal 
        isOpen={!!assignManagerDept} 
        onClose={() => setAssignManagerDept(null)} 
        department={assignManagerDept} 
        onSubmit={handleAssignManager} 
      />
    </div>
  );
}
