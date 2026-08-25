import type { UseFormRegister } from "react-hook-form";
import type { RegisterFormData } from "../auth.types";

interface Props {
  register: UseFormRegister<RegisterFormData>;
}

export default function CompanySection({ register }: Props) {
  return (
    <>
      <h3 className="text-xl font-semibold mb-5">
        Company Information
      </h3>

      <div className="grid md:grid-cols-2 gap-5">

        <input
          placeholder="Company Name"
          className="border rounded-xl p-3"
          {...register("companyName")}
        />

        <input
          placeholder="Company Email"
          className="border rounded-xl p-3"
          {...register("companyEmail")}
        />

        <input
          placeholder="Phone Number"
          className="border rounded-xl p-3"
          {...register("phone")}
        />

        <select
          className="border rounded-xl p-3"
          {...register("industry")}
        >
          <option value="LOGISTICS">
            Logistics
          </option>

          <option value="HEALTHCARE">
            Healthcare
          </option>

          <option value="MANUFACTURING">
            Manufacturing
          </option>

        </select>

      </div>
    </>
  );
}