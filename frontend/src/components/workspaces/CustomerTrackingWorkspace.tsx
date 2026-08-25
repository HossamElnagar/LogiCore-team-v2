import { useState } from "react";
import { useLanguage } from "../../context/LanguageContext";

export function CustomerTrackingWorkspace() {
  const { t, dir } = useLanguage();
  const [otp, setOtp] = useState("");
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");
  const [verified, setVerified] = useState(false);

  return (
    <div className="space-y-6" dir={dir}>
      <header className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-sky-600">{t("publicTrackingTitle")}</p>
        <h2 className="mt-2 text-3xl font-semibold text-slate-900">{t("publicTrackingSubtitle")}</h2>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="h-64 rounded-[1.25rem] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.16),_transparent_40%),linear-gradient(135deg,_#f8fbff_0%,_#eef4ff_100%)] p-6">
            <div className="h-full rounded-[1.1rem] border border-dashed border-slate-300 p-4 text-sm text-slate-500">
              Leaflet map placeholder showing live driver movement toward the customer pin.
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <input value={otp} onChange={(event) => setOtp(event.target.value)} className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-sky-400" placeholder={t("otpLabel")} />
            <button type="button" onClick={() => setVerified(true)} className="rounded-xl bg-sky-600 px-3 py-2 text-sm font-semibold text-white">{t("verifyOtpButton")}</button>
          </div>
          {verified ? <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{t("statusSuccess")}</div> : null}
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">{t("feedbackTitle")}</p>
          <h3 className="mt-1 text-xl font-semibold text-slate-900">{t("feedbackPrompt")}</h3>
          <div className="mt-5 space-y-4">
            <label className="block text-sm font-semibold text-slate-700">{t("ratingLabel")}</label>
            <select value={rating} onChange={(event) => setRating(Number(event.target.value))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
              {[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value} ★</option>)}
            </select>
            <label className="block text-sm font-semibold text-slate-700">{t("reviewLabel")}</label>
            <textarea value={review} onChange={(event) => setReview(event.target.value)} className="min-h-28 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-sky-400" />
            <button type="button" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">{t("submitFeedbackButton")}</button>
          </div>
        </section>
      </div>
    </div>
  );
}
