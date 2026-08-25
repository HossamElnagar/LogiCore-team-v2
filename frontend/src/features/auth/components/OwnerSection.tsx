import type{ UseFormRegister } from "react-hook-form";
import type{ RegisterFormData } from "../auth.types";

interface Props {
  register: UseFormRegister<RegisterFormData>;
}

export default function OwnerSection({ register }: Props) {
  return (
    <>
      <h3 className="text-xl font-semibold mb-5">
        Owner Information
      </h3>

      <div className="grid md:grid-cols-2 gap-5">

        <input
          placeholder="Full Name"
          className="border rounded-xl p-3"
          {...register("name")}
        />

        <input
          placeholder="Email Address"
          className="border rounded-xl p-3"
          {...register("email")}
        />

        <input
          type="password"
          placeholder="Password"
          className="border rounded-xl p-3"
          {...register("password")}
        />

        <input
          type="password"
          placeholder="Confirm Password"
          className="border rounded-xl p-3"
          {...register("confirmPassword")}
        />

      </div>
    </>
  );
}