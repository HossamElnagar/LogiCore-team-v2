export type DepartmentType = "OPERATIONS" | "CS" | "FINANCE";
export type DepartmentStatus = "CREATED" | "ACTIVE" | "INACTIVE";

export interface Department {
  _id: string;
  companyId: string;
  name: string;
  type: DepartmentType;
  status: DepartmentStatus;
  maxEmployees: number;
  location?: string;
  description?: string;
  managerId?: string;
  managerName?: string;
  employeeCount?: number;
}


export interface CreateDepartmentPayload {
  name: string;
  type: DepartmentType;
  location: string;
  managerId?: string;
  managerData?: {
    userName: string;
    email: string;
    password: string;
    phone?: string;
  };
}


export interface UpdateDepartmentPayload {
  name?: string;
  type?: DepartmentType;
  location?: string;
  status?: DepartmentStatus;
}

export interface AssignManagerPayload {
  managerId?: string;
  managerData?: {
    userName: string;
    email: string;
    password: string;
    phone?: string;
  };
}

export interface Employee {
  _id: string;
  companyId: string;
  departmentId: string;
  userName: string;
  email: string;
  role: string;
  phone?: string;
  isActive: boolean;
  isOnline: boolean;
  lastSeen?: string;
}

export interface CreateEmployeePayload {
  userName: string;
  email: string;
  password?: string;
  phone?: string;
  role: string;
}

export interface UpdateEmployeeStatusPayload {
  isActive: boolean;
}

export interface UpdateEmployeeRolePayload {
  role: string;
}