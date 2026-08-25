import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { incidentService } from "../incident.service";
import { setError, setIncidents, setLoading } from "../incidentSlice";
import type { RootState } from "../../../app/store";
import DriverIncidents from "./DriverIncidents";
import { UserRole } from "../../../types/user.types";

export default function IncidentsPage() {
  const dispatch = useDispatch();
  const { items, loading, error } = useSelector((state: RootState) => state.incidents);
  const { user } = useSelector((state: RootState) => state.auth);
  const [form, setForm] = useState({ title: "", description: "", severity: "MEDIUM", relatedEntityType: "SHIPMENT", relatedEntityId: "" });

  if (user?.role === UserRole.DRIVER || (user?.role as string) === "DRIVER") {
    return <DriverIncidents />;
  }

  useEffect(() => {
    void loadIncidents();
  }, []);

  const loadIncidents = async () => {
    dispatch(setLoading(true));
    try {
      const response = await incidentService.listIncidents();
      if (response.success) {
        dispatch(setIncidents(response.data));
      }
    } catch (err: any) {
      dispatch(setError(err?.response?.data?.message || "Unable to load incidents"));
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await incidentService.createIncident(form);
      setForm({ title: "", description: "", severity: "MEDIUM", relatedEntityType: "SHIPMENT", relatedEntityId: "" });
      void loadIncidents();
    } catch (err: any) {
      dispatch(setError(err?.response?.data?.message || "Unable to create incident"));
    }
  };

  const getStatusBadgeColor = (st: string) => {
    switch (st) {
      case "RESOLVED":
        return "bg-emerald-50 text-emerald-700 border border-emerald-200";
      case "OPEN":
        return "bg-red-50 text-red-700 border border-red-200";
      default:
        return "bg-slate-100 text-slate-700 border border-slate-200";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-emerald-600">Incident Management</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900">Report & Resolve Incidents</h1>
          <p className="mt-3 text-base text-slate-600">
            Track operational issues and maintain system reliability with centralized incident management.
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">Report New Incident</h2>
            <div className="mt-8 space-y-5">
              <div>
                <label htmlFor="incident-title" className="mb-3 block text-sm font-semibold text-slate-700">Title</label>
                <input 
                  id="incident-title"
                  value={form.title} 
                  onChange={(event) => setForm({ ...form, title: event.target.value })} 
                  placeholder="Incident title" 
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  required 
                />
              </div>
              <div>
                <label htmlFor="incident-description" className="mb-3 block text-sm font-semibold text-slate-700">Description</label>
                <textarea 
                  id="incident-description"
                  value={form.description} 
                  onChange={(event) => setForm({ ...form, description: event.target.value })} 
                  placeholder="Describe the issue in detail..." 
                  className="min-h-24 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  required 
                />
              </div>
              <div>
                <label htmlFor="incident-severity" className="mb-3 block text-sm font-semibold text-slate-700">Severity</label>
                <select 
                  id="incident-severity" 
                  value={form.severity} 
                  onChange={(event) => setForm({ ...form, severity: event.target.value })} 
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
              <div>
                <label htmlFor="incident-entity" className="mb-3 block text-sm font-semibold text-slate-700">Related Entity Type</label>
                <select 
                  id="incident-entity" 
                  value={form.relatedEntityType} 
                  onChange={(event) => setForm({ ...form, relatedEntityType: event.target.value })} 
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="SHIPMENT">Shipment</option>
                  <option value="VEHICLE">Vehicle</option>
                  <option value="DRIVER">Driver</option>
                  <option value="WAREHOUSE">Warehouse</option>
                </select>
              </div>
              <div>
                <label htmlFor="incident-id" className="mb-3 block text-sm font-semibold text-slate-700">Entity ID</label>
                <input 
                  id="incident-id"
                  value={form.relatedEntityId} 
                  onChange={(event) => setForm({ ...form, relatedEntityId: event.target.value })} 
                  placeholder="Enter the related entity ID" 
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  required 
                />
              </div>
              <button 
                type="submit" 
                className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-700 hover:shadow-lg"
              >
                Report Incident
              </button>
            </div>
          </form>

          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">Recent Incidents</h2>
            {loading && (
              <div className="flex items-center justify-center py-12">
                <p className="text-slate-600">Loading incidents...</p>
              </div>
            )}
            {error && (
              <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-red-700">{error}</p>
              </div>
            )}
            {!loading && !error && items.length === 0 && (
              <div className="mt-6 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <p className="text-slate-600">No incidents reported yet.</p>
              </div>
            )}
            {items.length > 0 && (
              <div className="mt-6 space-y-3">
                {items.map((incident) => (
                  <a 
                    key={incident._id} 
                    href={`/incidents/${incident._id}`} 
                    className="group block rounded-lg border border-slate-200 bg-slate-50 p-4 transition hover:border-emerald-300 hover:bg-white hover:shadow-md"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900 group-hover:text-emerald-600">{incident.title}</p>
                      </div>
                      <span className={`inline-flex flex-shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeColor(incident.status)}`}>
                        {incident.status}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-slate-600">{incident.description}</p>
                  </a>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
