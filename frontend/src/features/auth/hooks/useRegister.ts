import { useForm } from "react-hook-form";
import type { RegisterFormData } from "../auth.types";

export const useRegister = () => {
  return useForm<RegisterFormData>();
};