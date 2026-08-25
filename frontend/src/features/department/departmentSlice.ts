import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { departmentService } from "./department.service";
import type { Department, CreateDepartmentPayload, UpdateDepartmentPayload, AssignManagerPayload, Employee, CreateEmployeePayload } from "./types";

interface DepartmentState {
  departments: Department[];
  selectedDepartment: Department | null;
  selectedDepartmentEmployees: Employee[];
  loading: boolean;
  error: string | null;
}

const initialState: DepartmentState = {
  departments: [],
  selectedDepartment: null,
  selectedDepartmentEmployees: [],
  loading: false,
  error: null,
};

export const fetchDepartments = createAsyncThunk(
  "departments/fetchAll",
  async (filters: { status?: string; type?: string } | undefined, { rejectWithValue }) => {
    try {
      return await departmentService.getDepartments(filters);
    } catch (err: any) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const createDepartment = createAsyncThunk(
  "departments/create",
  async (payload: CreateDepartmentPayload, { rejectWithValue }) => {
    try {
      const result = await departmentService.createDepartment(payload);
      return result.department;
    } catch (err: any) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const updateDepartment = createAsyncThunk(
  "departments/update",
  async ({ id, data }: { id: string; data: UpdateDepartmentPayload }, { rejectWithValue }) => {
    try {
      return await departmentService.updateDepartment(id, data);
    } catch (err: any) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const assignManager = createAsyncThunk(
  "departments/assignManager",
  async ({ id, data }: { id: string; data: AssignManagerPayload }, { rejectWithValue }) => {
    try {
      return await departmentService.assignManager(id, data);
    } catch (err: any) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const deleteDepartment = createAsyncThunk(
  "departments/delete",
  async (id: string, { rejectWithValue }) => {
    try {
      await departmentService.deleteDepartment(id);
      return id;
    } catch (err: any) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const fetchDepartment = createAsyncThunk(
  "departments/fetchOne",
  async (id: string, { rejectWithValue }) => {
    try {
      return await departmentService.getDepartment(id);
    } catch (err: any) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const fetchDepartmentEmployees = createAsyncThunk(
  "departments/fetchEmployees",
  async (id: string, { rejectWithValue }) => {
    try {
      return await departmentService.getDepartmentEmployees(id);
    } catch (err: any) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const createEmployee = createAsyncThunk(
  "departments/createEmployee",
  async ({ id, data }: { id: string; data: CreateEmployeePayload }, { rejectWithValue }) => {
    try {
      return await departmentService.createEmployee(id, data);
    } catch (err: any) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const updateEmployeeStatus = createAsyncThunk(
  "departments/updateEmployeeStatus",
  async ({ id, userId, isActive }: { id: string; userId: string; isActive: boolean }, { rejectWithValue }) => {
    try {
      return await departmentService.updateEmployeeStatus(id, userId, isActive);
    } catch (err: any) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const updateEmployeeRole = createAsyncThunk(
  "departments/updateEmployeeRole",
  async ({ id, userId, role }: { id: string; userId: string; role: string }, { rejectWithValue }) => {
    try {
      return await departmentService.updateEmployeeRole(id, userId, role);
    } catch (err: any) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

const departmentSlice = createSlice({
  name: "departments",
  initialState,
  reducers: {
    clearSelectedDepartment: (state) => {
      state.selectedDepartment = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDepartments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDepartments.fulfilled, (state, action) => {
        state.loading = false;
        state.departments = action.payload;
      })
      .addCase(fetchDepartments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch departments";
      })
      .addCase(createDepartment.fulfilled, (state, action) => {
        state.departments.push(action.payload);
      })
      .addCase(updateDepartment.fulfilled, (state, action) => {
        const index = state.departments.findIndex((d) => d._id === action.payload._id);
        if (index !== -1) {
          state.departments[index] = { ...state.departments[index], ...action.payload };
        }
      })
      .addCase(assignManager.fulfilled, (state, action) => {
        const index = state.departments.findIndex((d) => d._id === action.payload._id);
        if (index !== -1) {
          state.departments[index] = { ...state.departments[index], ...action.payload };
        }
        if (state.selectedDepartment && state.selectedDepartment._id === action.payload._id) {
          state.selectedDepartment = { ...state.selectedDepartment, ...action.payload };
        }
      })
      .addCase(deleteDepartment.fulfilled, (state, action) => {
        state.departments = state.departments.filter((d) => d._id !== action.payload);
        if (state.selectedDepartment && state.selectedDepartment._id === action.payload) {
          state.selectedDepartment = null;
        }
      })
      .addCase(fetchDepartment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDepartment.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedDepartment = action.payload;
      })
      .addCase(fetchDepartment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch department";
      })
      .addCase(fetchDepartmentEmployees.fulfilled, (state, action) => {
        state.selectedDepartmentEmployees = action.payload;
      })
      .addCase(createEmployee.fulfilled, (state, action) => {
        state.selectedDepartmentEmployees.push(action.payload);
      })
      .addCase(updateEmployeeStatus.fulfilled, (state, action) => {
        const index = state.selectedDepartmentEmployees.findIndex((e) => e._id === action.payload._id);
        if (index !== -1) {
          state.selectedDepartmentEmployees[index] = action.payload;
        }
      })
      .addCase(updateEmployeeRole.fulfilled, (state, action) => {
        const index = state.selectedDepartmentEmployees.findIndex((e) => e._id === action.payload._id);
        if (index !== -1) {
          state.selectedDepartmentEmployees[index] = action.payload;
        }
      });
  },
});

export const { clearSelectedDepartment } = departmentSlice.actions;
export default departmentSlice.reducer;
