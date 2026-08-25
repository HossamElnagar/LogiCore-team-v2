import axios from "axios";
import { API_BASE_URL } from "../../constants/apiEndpoints";
import type { LoginFormData, RegisterFormData } from "./auth.types";

const authApi = axios.create({
  baseURL: `${API_BASE_URL}/auth`,
});

export const authService = {
  register: async (payload: RegisterFormData) => {
    const response = await authApi.post<{ success: boolean; data: any }>('/register', payload);
    return response.data;
  },
  login: async (payload: LoginFormData) => {
    const response = await authApi.post<{ success: boolean; data: any }>('/login', payload);
    return response.data;
  },
};
