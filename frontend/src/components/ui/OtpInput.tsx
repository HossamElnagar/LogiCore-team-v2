/**
 * OtpInput.tsx
 *
 * Interactive 4-digit OTP input with:
 *  • Auto-focus shift between digits on input
 *  • 5-minute countdown timer (ticking in real-time)
 *  • Shake animation on incorrect entry
 *  • Paste support for full OTP codes
 *  • Accessible labels and keyboard navigation
 */
import { useRef, useState, useEffect, useCallback } from "react";

interface OtpInputProps {
  onSubmit: (code: string) => Promise<{ success: boolean; message?: string }>;
  onExpired?: () => void;
  onResend?: () => void;
  /** Duration in seconds. Defaults to 300 (5 minutes). */
  expirySeconds?: number;
}

const DIGITS = 4;

export default function OtpInput({
  onSubmit,
  onExpired,
  onResend,
  expirySeconds = 300,
}: OtpInputProps) {
  const [values, setValues] = useState<string[]>(Array(DIGITS).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(expirySeconds);
  const [expired, setExpired] = useState(false);

  const inputRefs = useRef<Array<HTMLInputElement | null>>(Array(DIGITS).fill(null));

  // ── Countdown timer ────────────────────────────────────────────────────────
  useEffect(() => {
    if (secondsLeft <= 0) {
      setExpired(true);
      onExpired?.();
      return;
    }
    const tick = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(tick);
          setExpired(true);
          onExpired?.();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [onExpired, secondsLeft]);

  const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const seconds = String(secondsLeft % 60).padStart(2, "0");

  // Heat the timer ring colour — from emerald → amber → red as it counts down
  const timerPct = (secondsLeft / expirySeconds) * 100;
  const timerColor =
    timerPct > 50
      ? "text-emerald-500"
      : timerPct > 25
      ? "text-amber-500"
      : "text-rose-500";

  // ── Handle single digit input ──────────────────────────────────────────────
  const handleChange = (index: number, val: string) => {
    // Only accept numeric characters
    const sanitised = val.replace(/\D/g, "").slice(-1);
    const next = [...values];
    next[index] = sanitised;
    setValues(next);
    setError(null);

    // Advance focus to next field on entry
    if (sanitised && index < DIGITS - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // ── Backspace moves focus backwards ───────────────────────────────────────
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !values[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // ── Paste support — fills all digits from clipboard ───────────────────────
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, DIGITS);
    if (!pasted) return;
    const next = [...values];
    [...pasted].forEach((char, i) => { next[i] = char; });
    setValues(next);
    inputRefs.current[Math.min(pasted.length, DIGITS - 1)]?.focus();
  };

  // ── Trigger shake animation ────────────────────────────────────────────────
  const triggerShake = useCallback(() => {
    setShake(true);
    setTimeout(() => setShake(false), 620);
  }, []);

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = values.join("");
    if (code.length < DIGITS) {
      setError("Please enter all 4 digits.");
      triggerShake();
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await onSubmit(code);
      if (!result.success) {
        setError(result.message ?? "Incorrect OTP. Please try again.");
        setValues(Array(DIGITS).fill(""));
        inputRefs.current[0]?.focus();
        triggerShake();
      }
    } catch {
      setError("Something went wrong. Please try again.");
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  // ── Resend ─────────────────────────────────────────────────────────────────
  const handleResend = () => {
    setValues(Array(DIGITS).fill(""));
    setError(null);
    setExpired(false);
    setSecondsLeft(expirySeconds);
    inputRefs.current[0]?.focus();
    onResend?.();
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Timer */}
      <div className="flex flex-col items-center gap-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          OTP expires in
        </p>
        <p
          className={`font-mono text-3xl font-bold tabular-nums transition-colors duration-500 ${timerColor} ${
            expired ? "opacity-40" : ""
          }`}
          aria-live="polite"
          aria-label={`Time remaining: ${minutes} minutes and ${seconds} seconds`}
        >
          {minutes}:{seconds}
        </p>
      </div>

      {/* Digit inputs */}
      <form onSubmit={handleSubmit} noValidate>
        <div
          className={`flex gap-3 ${shake ? "animate-[shake_0.6s_ease-in-out]" : ""}`}
          role="group"
          aria-label="Enter your 4-digit OTP"
        >
          {values.map((val, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              id={`otp-digit-${i}`}
              type="text"
              inputMode="numeric"
              pattern="\d*"
              maxLength={1}
              value={val}
              disabled={expired || loading}
              autoComplete={i === 0 ? "one-time-code" : "off"}
              aria-label={`Digit ${i + 1}`}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              onFocus={(e) => e.target.select()}
              className={`
                h-16 w-14 rounded-2xl border-2 text-center text-2xl font-bold
                text-slate-900 outline-none shadow-sm transition-all duration-200
                ${val ? "border-emerald-400 bg-emerald-50" : "border-slate-300 bg-white"}
                ${error ? "border-rose-400 bg-rose-50" : ""}
                ${expired ? "cursor-not-allowed opacity-50" : ""}
                focus:border-sky-500 focus:ring-4 focus:ring-sky-100
                disabled:cursor-not-allowed disabled:opacity-50
              `}
            />
          ))}
        </div>

        {/* Error feedback */}
        {error && (
          <p
            role="alert"
            className="mt-4 text-center text-sm font-semibold text-rose-600"
          >
            {error}
          </p>
        )}

        {/* Submit / Resend */}
        {expired ? (
          <button
            type="button"
            onClick={handleResend}
            className="mt-5 w-full rounded-2xl bg-amber-600 px-6 py-3 text-sm font-semibold
                       text-white shadow-lg transition hover:bg-amber-700 active:scale-[0.98]"
          >
            Resend OTP
          </button>
        ) : (
          <button
            type="submit"
            disabled={loading || values.some((v) => !v)}
            className="mt-5 w-full rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-semibold
                       text-white shadow-lg shadow-emerald-600/25 transition
                       hover:bg-emerald-700 active:scale-[0.98]
                       disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Verifying…" : "Confirm Delivery"}
          </button>
        )}
      </form>

      {/* Shake keyframe — injected inline so no global CSS dependency */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          12.5%    { transform: translateX(-8px) rotate(-1deg); }
          37.5%    { transform: translateX(8px) rotate(1deg); }
          62.5%    { transform: translateX(-6px) rotate(-0.5deg); }
          87.5%    { transform: translateX(6px) rotate(0.5deg); }
        }
      `}</style>
    </div>
  );
}
