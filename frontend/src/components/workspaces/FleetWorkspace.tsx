import { useMemo, useState } from "react";
import { useLanguage } from "../../context/LanguageContext";

interface DriverCard {
  id: string;
  name: string;
  status: string;
  zone: string;
  activeJobs: number;
}

export function FleetWorkspace() {
  const { t, dir } = useLanguage();
  const [selectedDrivers, setSelectedDrivers] = useState<string[]>(["Hossam"]);
  const [chatMode, setChatMode] = useState<"direct" | "group">("direct");
  const [draft, setDraft] = useState("");

  const drivers: DriverCard[] = useMemo(
    () => [
      { id: "Hossam", name: "Hossam", status: "Online", zone: "Cairo East", activeJobs: 4 },
      { id: "Ahmed", name: "Ahmed", status: "En route", zone: "Giza", activeJobs: 2 },
      { id: "Nour", name: "Nour", status: "Offline", zone: "Nasr City", activeJobs: 1 },
    ],
    []
  );

  const toggleDriver = (driverId: string) => {
    setSelectedDrivers((prev) => (prev.includes(driverId) ? prev.filter((item) => item !== driverId) : [...prev, driverId]));
  };

  return (
    <div className="space-y-6" dir={dir}>
      <header className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-violet-600">{t("fleetWorkspaceTitle")}</p>
        <h2 className="mt-2 text-3xl font-semibold text-slate-900">{t("fleetWorkspaceSubtitle")}</h2>
      </header>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm text-slate-500">{t("fleetMetricOnline")}</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">2</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm text-slate-500">{t("fleetMetricTasks")}</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">11</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm text-slate-500">{t("fleetMetricAlerts")}</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">2</div>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {drivers.map((driver) => (
              <label key={driver.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div>
                  <div className="font-semibold text-slate-900">{driver.name}</div>
                  <div className="text-sm text-slate-500">{driver.zone}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">{driver.status}</span>
                  <input type="checkbox" checked={selectedDrivers.includes(driver.id)} onChange={() => toggleDriver(driver.id)} className="h-4 w-4 rounded border-slate-300" />
                </div>
              </label>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setChatMode("direct")} className={`rounded-xl px-3 py-2 text-sm font-semibold ${chatMode === "direct" ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-700"}`}>{t("fleetDirectChat")}</button>
            <button type="button" onClick={() => setChatMode("group")} className={`rounded-xl px-3 py-2 text-sm font-semibold ${chatMode === "group" ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-700"}`}>{t("fleetGroupChat")}</button>
          </div>

          <div className="mt-4 rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            {chatMode === "group"
              ? `Group chat ready for ${selectedDrivers.join(", ")}`
              : `Direct line ready for ${selectedDrivers[0] || "driver"}`}
          </div>

          <div className="mt-4 rounded-[1.25rem] border border-slate-200 bg-slate-50 p-3">
            <div className="rounded-2xl bg-white p-3 text-sm text-slate-700">Route briefing sent to the selected courier group.</div>
          </div>

          <div className="mt-4 flex gap-2">
            <input value={draft} onChange={(event) => setDraft(event.target.value)} className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-violet-400" placeholder="Type a message" />
            <button type="button" className="rounded-xl bg-violet-600 px-3 py-2 text-sm font-semibold text-white">Send</button>
          </div>
          <p className="mt-3 text-sm text-slate-500">Incident rooms remain restricted to support roles; fleet managers can observe summaries safely.</p>
        </section>
      </div>
    </div>
  );
}
