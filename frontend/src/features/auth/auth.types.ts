export interface RegisterFormData {
  companyName: string;
  companyEmail: string;
  phone?: string;
  industry: string;

  //owner info
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface LoginFormData {
  email: string;
  password: string;
}