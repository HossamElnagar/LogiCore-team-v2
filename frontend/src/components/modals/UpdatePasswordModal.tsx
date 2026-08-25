import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { userService } from "../../features/auth/user.service";
import { Eye, EyeOff, Lock, X, CheckCircle, AlertCircle } from "lucide-react";

// ── Zod Schema ────────────────────────────────────────────────────────────────

const schema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter")
      .regex(/[0-9]/, "Must contain at least one number"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

type FormData = z.infer<typeof schema>;

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

// ── Password Input Component ───────────────────────────────────────────────────

interface PasswordInputProps {
  id: string;
  label: string;
  placeholder?: string;
  error?: string;
  registration: any;
}

function PasswordInput({ id, label, placeholder, error, registration }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          placeholder={placeholder}
          {...registration}
          className={`w-full rounded-xl border px-4 py-2.5 pr-11 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:ring-2 ${
            error
              ? "border-red-300 focus:border-red-400 focus:ring-red-100"
              : "border-slate-200 focus:border-emerald-400 focus:ring-emerald-100"
          }`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 transition"
          tabIndex={-1}
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error && (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-red-500">
          <AlertCircle className="h-3 w-3 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

// ── Modal Component ────────────────────────────────────────────────────────────

export const UpdatePasswordModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  // Close and reset all state
  const handleClose = () => {
    reset();
    setSubmitError(null);
    setSuccess(false);
    onClose();
  };

  const onSubmit = async (data: FormData) => {
    setSubmitError(null);
    try {
      await userService.updatePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      setSuccess(true);
      // Auto-close after 2s on success
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err: any) {
      setSubmitError(
        err.response?.data?.message || err.message || "Failed to update password."
      );
    }
  };

  if (!isOpen) return null;

  return (
    /* Overlay */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      {/* Panel */}
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
              <Lock className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Update Password</h2>
              <p className="text-xs text-slate-500">Keep your account secure</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {/* Success state */}
          {success ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle className="h-7 w-7 text-emerald-600" />
              </div>
              <p className="font-semibold text-slate-900">Password Updated!</p>
              <p className="text-sm text-slate-500">Your password has been changed successfully.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              {/* API error banner */}
              {submitError && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {submitError}
                </div>
              )}

              <PasswordInput
                id="currentPassword"
                label="Current Password"
                placeholder="Enter your current password"
                registration={register("currentPassword")}
                error={errors.currentPassword?.message}
              />

              <PasswordInput
                id="newPassword"
                label="New Password"
                placeholder="Min 8 chars, 1 uppercase, 1 number"
                registration={register("newPassword")}
                error={errors.newPassword?.message}
              />

              <PasswordInput
                id="confirmPassword"
                label="Confirm New Password"
                placeholder="Re-enter your new password"
                registration={register("confirmPassword")}
                error={errors.confirmPassword?.message}
              />

              {/* Strength hint */}
              <p className="text-xs text-slate-400">
                Password must be at least 8 characters and include an uppercase letter and a number.
              </p>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition"
                >
                  {isSubmitting ? "Saving…" : "Update Password"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
