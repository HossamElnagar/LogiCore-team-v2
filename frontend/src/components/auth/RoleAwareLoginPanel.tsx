import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, BriefcaseBusiness, Landmark, BadgeCheck } from "lucide-react";
import { authService } from "../../features/auth/auth.service";
import { setCredentials } from "../../features/auth/authSlice";
import { useLanguage } from "../../context/LanguageContext";
import { UserRole } from "../../types/user.types";

/**
 * Maps the ACTUAL role string from the backend JWT to a dashboard route.
 * This must match every value in the backend UserRole enum exactly.
 */
function resolveRolePath(role: string): string {
  const r = role?.toUpperCase();
  switch (r) {
    case UserRole.OWNER:
      return "/dashboard/owner";
    case UserRole.CS_MANAGER:
    case UserRole.CS_AGENT:
      return "/dashboard/cs";
    case UserRole.FINANCE_MANAGER:
    case UserRole.ACCOUNTANT:    // backend legacy alias
      return "/dashboard/accounting";
    case UserRole.DRIVER_MANAGER:
    case UserRole.DRIVER:
      return "/dashboard/fleet";
    default:
      return "/dashboard";
  }
}

const departmentCards = [
  { 
    key: "owner", 
    titleKey: "loginRoleAdminTitle", 
    bodyKey: "loginRoleAdminBody", 
    icon: Building2,
    allowedRoles: [UserRole.OWNER],
    displayRole: UserRole.OWNER
  },
  { 
    key: "cs", 
    titleKey: "loginRoleManagerTitle", 
    bodyKey: "loginRoleManagerBody", 
    icon: BriefcaseBusiness,
    allowedRoles: [UserRole.CS_MANAGER, UserRole.CS_AGENT],
    displayRole: UserRole.CS_MANAGER
  },
  { 
    key: "finance", 
    titleKey: "loginRoleAccountantTitle", 
    bodyKey: "loginRoleAccountantBody", 
    icon: Landmark,
    allowedRoles: [UserRole.FINANCE_MANAGER, UserRole.ACCOUNTANT],
    displayRole: UserRole.FINANCE_MANAGER
  },
  { 
    key: "operations", 
    titleKey: "loginRoleDriverTitle", 
    bodyKey: "loginRoleDriverBody", 
    icon: BadgeCheck,
    allowedRoles: [UserRole.DRIVER_MANAGER, UserRole.DRIVER],
    displayRole: UserRole.DRIVER_MANAGER
  },
];

// ── Role-specific spinner config ──────────────────────────────────────────
const roleSpinnerConfig: Record<string, { color: string; glow: string; ring: string; label: string }> = {
  owner:      { color: "#f59e0b", glow: "rgba(245,158,11,0.35)",   ring: "border-amber-400",   label: "Authenticating Executive Access..." },
  cs:         { color: "#06b6d4", glow: "rgba(6,182,212,0.35)",    ring: "border-cyan-400",    label: "Loading Customer Operations..." },
  finance:    { color: "#10b981", glow: "rgba(16,185,129,0.35)",   ring: "border-emerald-400", label: "Verifying Financial Credentials..." },
  operations: { color: "#6366f1", glow: "rgba(99,102,241,0.35)",   ring: "border-indigo-400",  label: "Initializing Fleet Systems..." },
};

export function RoleAwareLoginPanel() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t, dir } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyContext, setCompanyContext] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("owner");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [pendingDept, setPendingDept] = useState("owner");
  const [pendingRoute, setPendingRoute] = useState("");

  // Navigate only after React paints the spinner overlay
  useEffect(() => {
    if (!loginSuccess || !pendingRoute) return;
    const timer = setTimeout(() => navigate(pendingRoute), 1500);
    return () => clearTimeout(timer);
  }, [loginSuccess, pendingRoute]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await authService.login({ email, password });
      if (response.success && response.data?.token) {
        const user = response.data.user || response.data;

        // ── Validate that the user's role matches the selected department ──
        const actualRole: string = (user.role ?? "").toUpperCase();
        const selectedDept = departmentCards.find(d => d.key === selectedDepartment);
        const allowedRoles = selectedDept?.allowedRoles.map(r => r.toUpperCase()) || [];

        // ── Check if user's role is authorized for the selected department ──
        if (actualRole && allowedRoles.length > 0 && !allowedRoles.includes(actualRole)) {
          // Generic error message - don't reveal user's role or department details
          setError(
            "Invalid login: Maybe the email does not exist, credentials are incorrect, or the role is not authorized for this department. Please verify your information."
          );
          setLoading(false);
          return;
        }

        if (!actualRole) {
          setError(
            "Invalid login: Maybe the email does not exist, credentials are incorrect, or the role is not authorized for this department. Please verify your information."
          );
          setLoading(false);
          return;
        }

        if (companyContext.trim()) {
          localStorage.setItem("companyContext", companyContext.trim());
        }

        // Store credentials in Redux (token + user with real role from API)
        dispatch(setCredentials({ token: response.data.token, user }));

        // Show spinner overlay — useEffect will navigate after 1.5s
        const route = resolveRolePath(actualRole);
        setPendingRoute(route);
        setPendingDept(selectedDepartment);
        setLoginSuccess(true);
        // Don't call setLoading(false) on success — let the overlay own the screen
      } else {
        setError(
          "Invalid login: Maybe the email does not exist, credentials are incorrect, or the role is not authorized for this department. Please verify your information."
        );
      }
    } catch (err: any) {
      setError(
        "Invalid login: Maybe the email does not exist, credentials are incorrect, or the role is not authorized for this department. Please verify your information."
      );
      setLoading(false);
    } finally {
      // Only reset loading if login did NOT succeed (success path owns screen via overlay)
      if (!loginSuccess) setLoading(false);
    }
  };

  const spinner = roleSpinnerConfig[pendingDept] ?? roleSpinnerConfig.owner;

  return (
    <>
      {/* ── Full-screen Login Spinner Overlay ── */}
      <AnimatePresence>
        {loginSuccess && (
          <motion.div
            key="login-spinner"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#060d1a]"
          >
            {/* Animated orbital rings */}
            <div className="relative flex h-32 w-32 items-center justify-center">
              {/* Outermost slow ring */}
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full border-2 border-dashed"
                style={{ borderColor: `${spinner.color}22` }}
              />
              {/* Middle fast glowing ring */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                className="absolute h-20 w-20 rounded-full border-[3px] border-transparent"
                style={{ borderTopColor: spinner.color, borderRightColor: spinner.color, boxShadow: `0 0 28px ${spinner.glow}` }}
              />
              {/* Inner medium ring counter-clockwise */}
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="absolute h-12 w-12 rounded-full border-2 border-transparent"
                style={{ borderBottomColor: spinner.color, borderLeftColor: `${spinner.color}66` }}
              />
              {/* Pulsing core */}
              <motion.div
                animate={{ scale: [0.7, 1.1, 0.7], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                className="h-5 w-5 rounded-full"
                style={{ backgroundColor: spinner.color, boxShadow: `0 0 24px ${spinner.glow}` }}
              />
            </div>

            {/* Logicore wordmark */}
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-8 text-xs font-bold uppercase tracking-[0.4em]"
              style={{ color: spinner.color }}
            >
              LOGICORE
            </motion.p>

            {/* Role-specific message */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0.7, 1] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
              className="mt-2 text-sm font-medium text-slate-400"
            >
              {spinner.label}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full" dir={dir}>
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">

      <div className="space-y-3">
        {departmentCards.map((deptCard) => {
          const Icon = deptCard.icon;
          const active = selectedDepartment === deptCard.key;

          return (
            <button
              key={deptCard.key}
              type="button"
              onClick={() => setSelectedDepartment(deptCard.key)}
              className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition ${
                active
                  ? "border-sky-400 bg-sky-50"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div
                className={`rounded-xl p-2 ${
                  active
                    ? "bg-sky-600 text-white"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                <Icon size={18} />
              </div>

              <div>
                <div className="font-semibold text-slate-900">
                  {t(deptCard.titleKey as any)}
                </div>

                <div className="mt-1 text-sm text-slate-500">
                  {t(deptCard.bodyKey as any)}
                </div>
              </div>
            </button>
          );
        })}
      </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <div className="font-semibold text-slate-900">{t("loginSelectedRolePrefix")} {t(departmentCards.find(d => d.key === selectedDepartment)?.titleKey as any)}</div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="email">{t("loginCorporateLabel")}</label>
            <input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-3 py-3 text-sm outline-none transition focus:border-sky-400" placeholder={t("loginFormPreview")} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="password">{t("passwordLabel")}</label>
            <input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-2xl border border-slate-300 px-3 py-3 text-sm outline-none transition focus:border-sky-400" placeholder="••••••••" required />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="company">{t("companyLabel")}</label>
            <input id="company" value={companyContext} onChange={(event) => setCompanyContext(event.target.value)} className="w-full rounded-2xl border border-slate-300 px-3 py-3 text-sm outline-none transition focus:border-sky-400" placeholder={dir === "rtl" ? "شركة النجار" : "Acme Logistics"} />
          </div>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <button type="submit" disabled={loading} className="w-full rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70">
            {loading ? t("signingInButton") : t("loginFormButton")}
          </button>
        </form>
      </div>
    </div>
    </>
  );
}
