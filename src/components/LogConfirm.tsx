import { useEffect, useRef, useState } from "react";
import { useAppStore } from "../stores/appStore";

function flagEmoji(code: string): string {
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

type WhenOption = "today" | "yesterday" | "earlier";

export default function LogConfirm() {
  const logConfirmDishId = useAppStore((s) => s.logConfirmDishId);
  const setLogConfirmDish = useAppStore((s) => s.setLogConfirmDish);
  const closeLogSheet = useAppStore((s) => s.closeLogSheet);
  const dishes = useAppStore((s) => s.dishes);
  const countries = useAppStore((s) => s.countries);
  const setDishStatus = useAppStore((s) => s.setDishStatus);
  const setDishRating = useAppStore((s) => s.setDishRating);
  const setDishNotes = useAppStore((s) => s.setDishNotes);
  const showToast = useAppStore((s) => s.showToast);
  const getCountryProgress = useAppStore((s) => s.getCountryProgress);
  const pendingPhoto = useAppStore((s) => s.pendingPhoto);
  const setPendingPhoto = useAppStore((s) => s.setPendingPhoto);
  const setDishPhoto = useAppStore((s) => s.setDishPhoto);

  const [isVisible, setIsVisible] = useState(false);
  const [when, setWhen] = useState<WhenOption>("today");
  const [earlierDate, setEarlierDate] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dish = dishes.find((d) => d.id === logConfirmDishId) ?? null;
  const country = dish ? countries.find((c) => c.id === dish.countryId) ?? null : null;

  // Animate open/close
  useEffect(() => {
    if (logConfirmDishId !== null) {
      const id = requestAnimationFrame(() => setIsVisible(true));
      return () => cancelAnimationFrame(id);
    } else {
      setIsVisible(false);
    }
  }, [logConfirmDishId]);

  // Reset form state when a new dish opens
  useEffect(() => {
    if (logConfirmDishId !== null) {
      setWhen("today");
      setEarlierDate("");
      setRating(null);
      setHoverRating(null);
      setNotes("");
    }
  }, [logConfirmDishId]);

  // Esc key: go back to LogSheet (clear confirm, but keep sheet open)
  useEffect(() => {
    if (logConfirmDishId === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [logConfirmDishId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      setLogConfirmDish(null);
      closeTimerRef.current = null;
    }, 300);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) handleClose();
  };

  const handleSave = () => {
    if (!dish || !country) return;

    // Check before setting
    const progress = getCountryProgress(dish.countryId);
    const isFirst = progress.tried === 0;

    setDishStatus(dish.id, "tried");
    if (rating !== null) setDishRating(dish.id, rating);
    if (notes.trim()) setDishNotes(dish.id, notes.trim());
    if (pendingPhoto) {
      setDishPhoto(dish.id, pendingPhoto);
    }

    showToast({
      dishName: dish.name,
      countryName: country.name,
      countryFlag: flagEmoji(country.code),
      isFirstInCountry: isFirst,
    });

    // Slide down then close everything
    setPendingPhoto(null);
    setIsVisible(false);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      closeLogSheet();
      closeTimerRef.current = null;
    }, 300);
  };

  const handleSkip = () => {
    handleClose();
  };

  if (logConfirmDishId === null) return null;
  if (!dish || !country) return null;

  const displayRating = hoverRating ?? rating ?? 0;

  return (
    <div
      className={`fixed inset-0 z-[3100] flex flex-col justify-end transition-colors duration-300 ${
        isVisible ? "bg-black/60 backdrop-blur-sm" : "bg-transparent"
      }`}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label={`Log ${dish.name}`}
    >
      {/* Sheet */}
      <div
        className={`relative w-full max-w-2xl mx-auto bg-white rounded-t-2xl shadow-2xl flex flex-col max-h-[90vh] transform transition-transform duration-300 ease-out ${
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
            Marking Tried
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

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-5">

          {/* Dish info card */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-amber-50 border border-amber-100">
            {/* Hatched thumbnail */}
            <div className="w-16 h-16 rounded-xl shrink-0 overflow-hidden bg-amber-100 border border-amber-200">
              <svg viewBox="0 0 64 64" className="w-full h-full text-amber-300">
                <defs>
                  <pattern id="hatch-confirm" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                    <line x1="0" y1="0" x2="0" y2="8" stroke="currentColor" strokeWidth="3" />
                  </pattern>
                </defs>
                <rect width="64" height="64" fill="url(#hatch-confirm)" />
                <text x="32" y="40" textAnchor="middle" fontSize="24" fill="rgba(0,0,0,0.2)">🍽</text>
              </svg>
            </div>

            {/* Dish details */}
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-gray-900 leading-tight truncate">
                {dish.name}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {flagEmoji(country.code)}{" "}
                <span className="font-medium">{country.name}</span>
                {" · "}
                <span className="capitalize">{dish.category}</span>
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {dish.isSignature && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-200 text-amber-800 text-xs font-semibold">
                    ★ Signature
                  </span>
                )}
                {dish.spiceLevel !== "mild" && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold capitalize">
                    🌶 {dish.spiceLevel}
                  </span>
                )}
              </div>
            </div>
          </div>
          {pendingPhoto && (
            <div className="mt-2 rounded-xl overflow-hidden border border-gray-200">
              <img src={pendingPhoto} alt="Your photo" className="w-full max-h-32 object-cover" />
            </div>
          )}

          {/* WHEN section */}
          <section>
            <p className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-2">
              When
            </p>
            <div className="flex gap-2">
              {(["today", "yesterday", "earlier"] as WhenOption[]).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setWhen(opt)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border-2 transition-all capitalize ${
                    when === opt
                      ? "border-amber-400 bg-amber-50 text-amber-800"
                      : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {opt === "earlier" ? "Earlier…" : opt.charAt(0).toUpperCase() + opt.slice(1)}
                </button>
              ))}
            </div>
            {when === "earlier" && (
              <input
                type="date"
                value={earlierDate}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setEarlierDate(e.target.value)}
                className="mt-2 w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition-all"
              />
            )}
          </section>

          {/* RATING section */}
          <section>
            <p className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-2">
              Rating{" "}
              <span className="normal-case font-normal text-gray-400 tracking-normal">(optional)</span>
            </p>
            <div className="flex items-center gap-1" role="group" aria-label="Star rating">
              {[1, 2, 3, 4, 5].map((star) => {
                const filled = star <= displayRating;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(rating === star ? null : star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(null)}
                    aria-label={`${star} star${star > 1 ? "s" : ""}`}
                    className="p-1 transition-transform hover:scale-110 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill={filled ? "currentColor" : "none"}
                      stroke="currentColor"
                      strokeWidth={filled ? 0 : 1.5}
                      className={`w-8 h-8 transition-colors duration-150 ${
                        filled ? "text-amber-400 drop-shadow-sm" : "text-gray-300"
                      }`}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"
                      />
                    </svg>
                  </button>
                );
              })}
              {rating !== null && (
                <button
                  type="button"
                  onClick={() => setRating(null)}
                  className="ml-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  clear
                </button>
              )}
            </div>
          </section>

          {/* NOTE section */}
          <section>
            <p className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-2">
              Note{" "}
              <span className="normal-case font-normal text-gray-400 tracking-normal">(optional)</span>
            </p>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="that hole-in-the-wall on Rustaveli…"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 resize-none transition-all"
            />
          </section>
        </div>

        {/* Sticky bottom actions */}
        <div className="shrink-0 flex items-center gap-3 px-5 py-4 border-t border-gray-100 bg-white rounded-b-none">
          <button
            type="button"
            onClick={handleSkip}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            skip
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-sm font-bold tracking-wide shadow-md hover:shadow-lg transition-all"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
