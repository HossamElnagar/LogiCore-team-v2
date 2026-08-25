import { useLanguage } from "../../context/LanguageContext";

export function LanguageToggle() {
  const { language, toggleLanguage } = useLanguage();

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className="fixed right-4 top-4 z-[60] rounded-full border border-slate-300 bg-white/95 px-3 py-2 text-sm font-semibold text-slate-700 shadow-lg backdrop-blur transition hover:border-sky-400 hover:text-sky-700"
      aria-label="Toggle language"
    >
      <span className="inline-flex items-center gap-2">
        <span className="text-base">🌐</span>
        <span>{language === "ar" ? "English" : "العربية"}</span>
      </span>
    </button>
  );
}
