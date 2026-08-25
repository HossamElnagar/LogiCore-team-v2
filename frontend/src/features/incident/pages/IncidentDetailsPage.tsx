import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { incidentService } from "../incident.service";

export default function IncidentDetailsPage() {
  const { id } = useParams();
  const [incident, setIncident] = useState<any>(null);
  const [status, setStatus] = useState("OPEN");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadIncident();
  }, [id]);

  const loadIncident = async () => {
    if (!id) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await incidentService.getIncidentById(id);
      if (response.success) {
        setIncident(response.data);
        setStatus(response.data.status);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to load incident");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!id) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await incidentService.updateIncidentStatus(id, status);
      if (response.success) {
        setIncident(response.data);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to update incident status");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen px-4 py-10 text-slate-600">Loading incident...</div>;
  }

  if (!incident) {
    return <div className="min-h-screen px-4 py-10 text-rose-600">{error || "Incident not found"}</div>;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.16),_transparent_30%),linear-gradient(135deg,_#f8fbff_0%,_#eef4ff_100%)] px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="rounded-3xl border border-slate-200/80 bg-white/80 p-6 shadow-[0_20px_45px_-20px_rgba(15,23,42,0.35)] backdrop-blur">
          <Link to="/incidents" className="text-sm font-semibold text-sky-600">← Back to incidents</Link>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.32em] text-sky-600">Incident details</p>
              <h1 className="mt-2 text-3xl font-semibold">{incident.title}</h1>
            </div>
            <span className="rounded-full bg-sky-100 px-3 py-1 text-sm font-semibold text-sky-700">{incident.status}</span>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
          <div className="rounded-3xl border border-slate-200/80 bg-white/85 p-6 shadow-[0_20px_45px_-20px_rgba(15,23,42,0.28)] backdrop-blur">
            <h2 className="text-xl font-semibold">Incident summary</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <p><span className="font-semibold">Severity:</span> {incident.severity}</p>
              <p><span className="font-semibold">Entity:</span> {incident.relatedEntityType}</p>
              <p><span className="font-semibold">Entity ID:</span> {incident.relatedEntityId}</p>
              <p><span className="font-semibold">Description:</span> {incident.description}</p>
              <p><span className="font-semibold">Reported:</span> {new Date(incident.createdAt).toLocaleString()}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200/80 bg-white/85 p-6 shadow-[0_20px_45px_-20px_rgba(15,23,42,0.28)] backdrop-blur">
            <h2 className="text-xl font-semibold">Update resolution status</h2>
            <div className="mt-4 space-y-4">
              <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="incident-status">Status</label>
              <select id="incident-status" value={status} onChange={(event) => setStatus(event.target.value)} className="w-full rounded-2xl border border-slate-300 px-3 py-3">
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
              {error ? <p className="text-sm text-rose-600">{error}</p> : null}
              <button type="submit" disabled={saving} className="w-full rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70">
                {saving ? "Updating..." : "Save status"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
