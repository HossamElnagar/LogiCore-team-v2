import { useLanguage } from "../../../context/LanguageContext";
import { LanguageToggle } from "../../../components/ui/LanguageToggle";
import { RoleAwareLoginPanel } from "../../../components/auth/RoleAwareLoginPanel";

export default function LoginPage() {
  const { t, dir } = useLanguage();

  return (
    <div
      className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.16),_transparent_30%),linear-gradient(135deg,_#f8fbff_0%,_#eef4ff_100%)] px-4 py-10 text-slate-900 sm:px-6 lg:px-8"
      dir={dir}
    >
      <div className="mx-auto flex max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_20px_45px_-20px_rgba(15,23,42,0.35)] lg:flex-row">
        <div className="flex flex-1 flex-col justify-center bg-slate-950 p-8 text-white">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-sky-400">{t("appTitle")}</p>
            <LanguageToggle />
          </div>
          <h1 className="mt-4 text-3xl font-semibold">{t("loginTitle")}</h1>
          <p className="mt-3 max-w-md text-sm text-slate-300">{t("loginSubtitle")}</p>
        </div>
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="w-full max-w-md space-y-4">
            <RoleAwareLoginPanel />
            <p className="text-center text-sm text-slate-500">
              New here? <a href="/register" className="font-semibold text-sky-600">Create a workspace</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
