import { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { authService } from "../auth.service";
import { setCredentials } from "../authSlice";

export default function RegisterPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    companyName: "",
    companyEmail: "",
    phone: "",
    industry: "LOGISTICS",
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    slug: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await authService.register(form);
      if (response.success && response.data?.token) {
        dispatch(setCredentials({
          token: response.data.token,
          user: response.data.user,
        }));
        navigate("/dashboard");
      } else {
        setError("Registration failed");
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to create workspace");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.16),_transparent_30%),linear-gradient(135deg,_#f8fbff_0%,_#eef4ff_100%)] px-4 py-10 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_20px_45px_-20px_rgba(15,23,42,0.35)] lg:flex-row">
        <div className="flex flex-1 flex-col justify-center bg-slate-950 p-8 text-white">
          <p className="text-sm font-semibold uppercase tracking-[0.32em] text-sky-400">Create your workspace</p>
          <h1 className="mt-4 text-3xl font-semibold">Launch your multi-tenant logistics operation</h1>
          <p className="mt-3 max-w-md text-sm text-slate-300">Register a company, create the owner account, and start managing shipments inside a dedicated tenant workspace.</p>
        </div>
        <div className="flex flex-1 items-center justify-center p-8">
          <form className="w-full max-w-2xl space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Company Name</label>
                <input name="companyName" value={form.companyName} onChange={handleChange} className="w-full rounded-2xl border border-slate-300 px-3 py-3 shadow-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100" placeholder="Acme Logistics" required />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Workspace Slug</label>
                <input name="slug" value={form.slug} onChange={handleChange} className="w-full rounded-2xl border border-slate-300 px-3 py-3 shadow-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100" placeholder="acme-logistics" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Company Email</label>
                <input name="companyEmail" type="email" value={form.companyEmail} onChange={handleChange} className="w-full rounded-2xl border border-slate-300 px-3 py-3 shadow-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100" placeholder="ops@company.com" required />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="industry">Industry</label>
                <select id="industry" name="industry" value={form.industry} onChange={handleChange} className="w-full rounded-2xl border border-slate-300 px-3 py-3 shadow-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100">
                  <option value="LOGISTICS">Logistics</option>
                  <option value="HEALTHCARE">Healthcare</option>
                  <option value="MANUFACTURING">Manufacturing</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Phone</label>
                <input name="phone" value={form.phone} onChange={handleChange} className="w-full rounded-2xl border border-slate-300 px-3 py-3 shadow-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100" placeholder="01000000000" />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Owner Name</label>
                <input name="name" value={form.name} onChange={handleChange} className="w-full rounded-2xl border border-slate-300 px-3 py-3 shadow-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100" placeholder="Your name" required />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Owner Email</label>
                <input name="email" type="email" value={form.email} onChange={handleChange} className="w-full rounded-2xl border border-slate-300 px-3 py-3 shadow-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100" placeholder="you@company.com" required />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Password</label>
                <input name="password" type="password" value={form.password} onChange={handleChange} className="w-full rounded-2xl border border-slate-300 px-3 py-3 shadow-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100" placeholder="Choose a password" required />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Confirm Password</label>
                <input name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} className="w-full rounded-2xl border border-slate-300 px-3 py-3 shadow-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100" placeholder="Confirm password" required />
              </div>
            </div>
            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
            <button type="submit" disabled={loading} className="w-full rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-600/20 transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70">
              {loading ? "Creating workspace..." : "Create workspace"}
            </button>
            <p className="text-center text-sm text-slate-500">
              Already have an account? <a href="/login" className="font-semibold text-sky-600">Sign in</a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}