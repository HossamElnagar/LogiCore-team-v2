export default function RegisterHero() {
  return (
    <div className="hidden lg:flex flex-col justify-center bg-gradient-to-br from-white via-sky-50 to-cyan-100 p-16">

      <h1 className="text-5xl font-bold text-slate-900 leading-tight">
        Smart Logistics Operations Platform
      </h1>

      <p className="mt-8 text-slate-600 text-lg leading-8">
        Manage shipments, incidents, analytics and operational
        decision rooms from one intelligent platform.
      </p>

      <div className="mt-12 space-y-4">

        <div className="flex gap-3">
          <span>✓</span>
          <p>Real-time tracking</p>
        </div>

        <div className="flex gap-3">
          <span>✓</span>
          <p>Incident intelligence</p>
        </div>

        <div className="flex gap-3">
          <span>✓</span>
          <p>Decision rooms</p>
        </div>

        <div className="flex gap-3">
          <span>✓</span>
          <p>Analytics dashboard</p>
        </div>

      </div>

    </div>
  );
}