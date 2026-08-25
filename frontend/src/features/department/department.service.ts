import axiosInstance from "../../api/axios";
import type { Department, CreateDepartmentPayload, UpdateDepartmentPayload, AssignManagerPayload } from "./types";

export const departmentService = {
  getDepartments: async (filters: { status?: string; type?: string } = {}) => {
    const response = await axiosInstance.get('/departments', { params: filters });
    return response.data.data as Department[];
  },

  getDepartment: async (id: string) => {
    const response = await axiosInstance.get(`/departments/${id}`);
    return response.data.data;
  },

  createDepartment: async (data: CreateDepartmentPayload) => {
    const response = await axiosInstance.post('/departments', data);
    return response.data.data;
  },

  updateDepartment: async (id: string, data: UpdateDepartmentPayload) => {
    const response = await axiosInstance.patch(`/departments/${id}`, data);
    return response.data.data;
  },

  assignManager: async (id: string, data: AssignManagerPayload) => {
    const response = await axiosInstance.patch(`/departments/${id}/manager`, data);
    return response.data.data;
  },

  deleteDepartment: async (id: string) => {
    const response = await axiosInstance.delete(`/departments/${id}`);
    return response.data;
  },

  getDepartmentEmployees: async (id: string) => {
    const response = await axiosInstance.get(`/departments/${id}/employees`);
    return response.data.data;
  },

  createEmployee: async (id: string, data: any) => {
    const response = await axiosInstance.post(`/departments/${id}/employees`, data);
    return response.data.data;
  },

  updateEmployeeStatus: async (id: string, userId: string, isActive: boolean) => {
    const response = await axiosInstance.patch(`/departments/${id}/employees/${userId}/status`, { isActive });
    return response.data.data;
  },

  updateEmployeeRole: async (id: string, userId: string, role: string) => {
    const response = await axiosInstance.patch(`/departments/${id}/employees/${userId}/role`, { role });
    return response.data.data;
  }
};
