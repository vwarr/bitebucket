import { useEffect, useRef, useState } from "react";
import { useAppStore } from "../stores/appStore";

function flagEmoji(code: string): string {
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

export default function LogSheet() {
  const showLogSheet = useAppStore((s) => s.showLogSheet);
  const closeLogSheet = useAppStore((s) => s.closeLogSheet);
  const logSearchQuery = useAppStore((s) => s.logSearchQuery);
  const setLogSearchQuery = useAppStore((s) => s.setLogSearchQuery);
  const setLogConfirmDish = useAppStore((s) => s.setLogConfirmDish);
  const dishes = useAppStore((s) => s.dishes);
  const countries = useAppStore((s) => s.countries);
  const userEntries = useAppStore((s) => s.userEntries);

  const [isVisible, setIsVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animate open/close
  useEffect(() => {
    if (showLogSheet) {
      const id = requestAnimationFrame(() => setIsVisible(true));
      return () => cancelAnimationFrame(id);
    } else {
      setIsVisible(false);
    }
  }, [showLogSheet]);

  // Auto-focus input on open
  useEffect(() => {
    if (isVisible) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [isVisible]);

  // Esc key closes
  useEffect(() => {
    if (!showLogSheet) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showLogSheet]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      closeLogSheet();
      closeTimerRef.current = null;
    }, 300);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) handleClose();
  };

  // Filtered dishes — top 6 by name match
  const matchedDishes = logSearchQuery.trim().length > 0
    ? dishes
        .filter((d) =>
          d.name.toLowerCase().includes(logSearchQuery.toLowerCase())
        )
        .slice(0, 6)
    : [];

  // Shortlist: want-to-try dishes
  const shortlistDishes = dishes
    .filter((d) => userEntries.get(d.id)?.status === "want-to-try")
    .slice(0, 12);

  if (!showLogSheet) return null;

  return (
    <div
      className={`fixed inset-0 z-[3000] flex flex-col justify-end transition-colors duration-300 ${
        isVisible ? "bg-black/50 backdrop-blur-sm" : "bg-transparent"
      }`}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="Log a dish"
    >
      {/* Sheet */}
      <div
        className={`relative w-full max-w-2xl mx-auto bg-white rounded-t-2xl shadow-2xl flex flex-col max-h-[85vh] transform transition-transform duration-300 ease-out ${
          isVisible ? "translate-y-0" : "translate-y-full"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1.5 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 shrink-0">
          <span className="text-xs font-bold tracking-widest text-amber-600 uppercase">
            Log a Dish
          </span>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-gray-900 px-5 pb-3 shrink-0">
          What did you eat?
        </h2>

        {/* Search input */}
        <div className="px-5 pb-4 shrink-0">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={logSearchQuery}
              onChange={(e) => setLogSearchQuery(e.target.value)}
              placeholder="Search dishes…"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition-all"
            />
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-5">

          {/* MATCHES section */}
          {matchedDishes.length > 0 && (
            <section>
              <p className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-2">
                Matches
              </p>
              <ul className="space-y-2">
                {matchedDishes.map((dish, idx) => {
                  const country = countries.find((c) => c.id === dish.countryId);
                  const isFirst = idx === 0;
                  return (
                    <li key={dish.id}>
                      <button
                        type="button"
                        onClick={() => setLogConfirmDish(dish.id)}
                        className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border transition-all hover:shadow-sm ${
                          isFirst
                            ? "border-amber-300 bg-amber-50 hover:bg-amber-100"
                            : "border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300"
                        }`}
                      >
                        {/* Thumbnail placeholder */}
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-200 to-orange-300 flex items-center justify-center shrink-0 text-lg select-none">
                          {country ? flagEmoji(country.code) : "🍽️"}
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className={`font-bold text-sm truncate ${isFirst ? "text-amber-900" : "text-gray-900"}`}>
                            {dish.name}
                            {dish.isSignature && (
                              <span className="ml-1 text-amber-500 text-xs">★</span>
                            )}
                          </p>
                          <p className={`text-xs truncate mt-0.5 ${isFirst ? "text-amber-700" : "text-gray-500"}`}>
                            {country ? `${flagEmoji(country.code)} ${country.name}` : ""}
                            {dish.description ? ` · ${dish.description}` : ""}
                          </p>
                        </div>
                        {isFirst && (
                          <svg className="w-4 h-4 text-amber-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* No results message */}
          {logSearchQuery.trim().length > 0 && matchedDishes.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">
              No dishes found for "{logSearchQuery}"
            </p>
          )}

          {/* OR section */}
          <section>
            {matchedDishes.length > 0 && (
              <div className="flex items-center gap-3 mb-3">
                <hr className="flex-1 border-gray-200" />
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Or</span>
                <hr className="flex-1 border-gray-200" />
              </div>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-gray-300 text-gray-600 text-sm font-medium hover:border-amber-400 hover:text-amber-700 hover:bg-amber-50 transition-all"
                onClick={() => {/* no-op */}}
              >
                <span>+</span>
                <span>Custom dish</span>
              </button>
              <button
                type="button"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-gray-300 text-gray-600 text-sm font-medium hover:border-amber-400 hover:text-amber-700 hover:bg-amber-50 transition-all"
                onClick={() => {/* no-op */}}
              >
                <span>📷</span>
                <span>Photo</span>
              </button>
            </div>
          </section>

          {/* SHORTLIST section */}
          {shortlistDishes.length > 0 && (
            <section>
              <p className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-2">
                Shortlist
              </p>
              <div className="flex flex-wrap gap-2">
                {shortlistDishes.map((dish) => {
                  const country = countries.find((c) => c.id === dish.countryId);
                  return (
                    <button
                      key={dish.id}
                      type="button"
                      onClick={() => setLogConfirmDish(dish.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 border border-amber-200 text-amber-800 text-sm font-medium hover:bg-amber-200 hover:border-amber-300 transition-colors"
                    >
                      {country && (
                        <span className="text-base leading-none">{flagEmoji(country.code)}</span>
                      )}
                      <span>{dish.name}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

        </div>
      </div>
    </div>
  );
}
