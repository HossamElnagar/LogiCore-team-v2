import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { UserRole, CANONICAL_ROLES } from "../../types/user.types";

interface AuthUser {
  id: string;
  companyId: string;
  userName: string;
  email: string;
  role: UserRole;
  departmentId?: string;
  isActive: boolean;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
}

const getUserFromStorage = (): AuthUser | null => {
  const userStr = localStorage.getItem("authUser");
  if (userStr) {
    try {
      const parsedUser = JSON.parse(userStr) as AuthUser;
      
      // Force a clean logout for any legacy roles not in our canonical enum
      if (!CANONICAL_ROLES.includes(parsedUser.role)) {
        console.warn(`Deprecated role '${parsedUser.role}' found in local storage. Forcing clean logout.`);
        localStorage.removeItem("authUser");
        localStorage.removeItem("authToken");
        return null;
      }
      
      return parsedUser;
    } catch (e) {
      return null;
    }
  }
  return null;
};

const user = getUserFromStorage();
const token = user ? localStorage.getItem("authToken") : null;

const initialState: AuthState = {
  user,
  token,
  isAuthenticated: Boolean(token),
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<{ user: AuthUser; token: string }>) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      localStorage.setItem("authToken", action.payload.token);
      localStorage.setItem("authUser", JSON.stringify(action.payload.user));
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      localStorage.removeItem("authToken");
      localStorage.removeItem("authUser");
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
