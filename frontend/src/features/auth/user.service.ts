import axiosInstance from "../../api/axios";

/**
 * Calls the backend to update the current authenticated user's password.
 * The JWT token is automatically appended by the axios request interceptor.
 */
export const userService = {
  updatePassword: async (data: {
    currentPassword: string;
    newPassword: string;
  }) => {
    const response = await axiosInstance.patch("/users/update-password", data);
    return response.data;
  },
};
