import { useMemo } from "react";
import { useLanguage } from "../../context/LanguageContext";

export function OwnerWorkspace() {
  const { t, dir } = useLanguage();

  const cards = useMemo(() => [
    { label: t("ownerMetricRevenue"), value: "EGP 248,000" },
    { label: t("ownerMetricEscalations"), value: "24" },
    { label: t("ownerMetricCoverage"), value: "94%" },
    { label: t("ownerMetricCollections"), value: "EGP 175,000" },
  ], []);

  return (
    <div className="space-y-6" dir={dir}>
      <header className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-emerald-600">{t("ownerWorkspaceTitle")}</p>
        <h2 className="mt-2 text-3xl font-semibold text-slate-900">{t("ownerWorkspaceSubtitle")}</h2>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-semibold text-slate-500">{card.label}</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">{card.value}</div>
          </div>
        ))}
      </div>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">{t("ownerEscalationsTitle")}</p>
            <h3 className="mt-1 text-xl font-semibold text-slate-900">High-priority escalations</h3>
          </div>
        </div>
        <div className="mt-5 space-y-3">
          {["Premium client delay", "Warehouse mismatch", "Driver proof dispute"].map((item) => (
            <div key={item} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="font-semibold text-slate-900">{item}</div>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">{t("ownerEscalationBadge")}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
