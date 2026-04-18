import { useEffect, useRef, useState } from "react";
import { useAppStore } from "../stores/appStore";
import type { DishCategory, DishStatus } from "../types";
import StarRating from "./StarRating";
import SpiceIndicator from "./SpiceIndicator";

// ── Category icons (inline SVG paths) ──────────────────────────────

const CATEGORY_ICONS: Record<DishCategory, string> = {
  appetizer:
    "M3 12h18M12 3v18M7.5 7.5l9 9M16.5 7.5l-9 9",
  main: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z",
  dessert:
    "M12 2L2 19h20L12 2zm0 4l6.5 11h-13L12 6z",
  "street food":
    "M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z",
  beverage:
    "M3 14c0 1.3.84 2.4 2 2.82V20H3v2h6v-2H7v-3.18C8.16 16.4 9 15.3 9 14V6H3v8zm2-6h2v3H5V8zm15.64 1.35l-.85-.85a.996.996 0 00-1.41 0l-.85.85-.85-.85a.996.996 0 00-1.41 0l-.85.85-.85-.85a.996.996 0 00-1.41 0l-.85.85V14c0 3.31 2.69 6 6 6h.28c3.18-.14 5.72-2.81 5.72-6V9.35l-.85.85a.99.99 0 01-1.41 0l-.51-.5z",
  snack:
    "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z",
};

const CATEGORY_GRADIENTS: Record<DishCategory, string> = {
  appetizer: "from-emerald-400 to-teal-500",
  main: "from-orange-400 to-red-500",
  dessert: "from-pink-400 to-rose-500",
  "street food": "from-amber-400 to-yellow-500",
  beverage: "from-sky-400 to-blue-500",
  snack: "from-violet-400 to-purple-500",
};

const DIFFICULTY_TEXT: Record<string, (countryName: string) => string> = {
  "easily available": (c) =>
    `Widely available at ${c} restaurants and many international spots.`,
  regional: (c) =>
    `May require seeking out specialty ${c} restaurants or ethnic neighborhoods.`,
  "rare/travel-required": (c) =>
    `Very hard to find outside ${c}. Traveling there is likely the best way to try it.`,
};

const STATUS_CONFIG: Record<
  Exclude<DishStatus, "untried">,
  { label: string; icon: string; activeClass: string }
> = {
  tried: {
    label: "Tried it",
    icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    activeClass: "bg-emerald-500 text-white border-emerald-500",
  },
  "want-to-try": {
    label: "Want to try",
    icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
    activeClass: "bg-rose-500 text-white border-rose-500",
  },
  skipped: {
    label: "Skip",
    icon: "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636",
    activeClass: "bg-gray-500 text-white border-gray-500",
  },
};

export default function DishDetail() {
  const selectedDishId = useAppStore((s) => s.selectedDishId);
  const dishes = useAppStore((s) => s.dishes);
  const countries = useAppStore((s) => s.countries);
  const userEntries = useAppStore((s) => s.userEntries);
  const selectDish = useAppStore((s) => s.selectDish);
  const setDishStatus = useAppStore((s) => s.setDishStatus);
  const setDishRating = useAppStore((s) => s.setDishRating);
  const setDishNotes = useAppStore((s) => s.setDishNotes);
  const getDishWarnings = useAppStore((s) => s.getDishWarnings);

  const [notesValue, setNotesValue] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const dish = dishes.find((d) => d.id === selectedDishId);
  const country = dish ? countries.find((c) => c.id === dish.countryId) : null;
  const entry = dish ? userEntries.get(dish.id) : undefined;
  const warnings = dish ? getDishWarnings(dish) : [];

  // Sync notes from store when dish changes
  useEffect(() => {
    setNotesValue(entry?.notes ?? "");
  }, [entry?.notes, selectedDishId]);

  // Animate open/close
  useEffect(() => {
    if (selectedDishId !== null) {
      // Small delay so the DOM renders before the transition class is applied
      requestAnimationFrame(() => setIsVisible(true));
    } else {
      setIsVisible(false);
    }
  }, [selectedDishId]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => selectDish(null), 300);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) handleClose();
  };

  const handleNotesBlur = () => {
    if (dish) {
      setDishNotes(dish.id, notesValue.trim());
    }
  };

  const handleStatusClick = (status: DishStatus) => {
    if (!dish) return;
    if (entry?.status === status) {
      setDishStatus(dish.id, "untried");
    } else {
      setDishStatus(dish.id, status);
      if (status === "tried" && !entry?.triedDate) {
        // The store doesn't set triedDate automatically — we handle it inline
      }
    }
  };

  if (selectedDishId === null) return null;
  if (!dish || !country) return null;

  const gradient = CATEGORY_GRADIENTS[dish.category] ?? "from-gray-400 to-gray-500";

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-end transition-colors duration-300 ${
        isVisible ? "bg-black/40 backdrop-blur-sm" : "bg-transparent"
      }`}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label={`Details for ${dish.name}`}
    >
      {/* Panel */}
      <div
        ref={panelRef}
        className={`relative w-full max-w-lg bg-white dark:bg-gray-900 shadow-2xl overflow-y-auto transform transition-transform duration-300 ease-out ${
          isVisible ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-black/20 text-white hover:bg-black/40 transition-colors backdrop-blur-sm"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* ── Image placeholder ───────────────────────────────── */}
        <div className={`relative h-52 bg-gradient-to-br ${gradient} flex items-center justify-center overflow-hidden`}>
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" viewBox="0 0 200 200">
              <pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="10" cy="10" r="2" fill="currentColor" />
              </pattern>
              <rect width="200" height="200" fill="url(#dots)" />
            </svg>
          </div>
          <svg className="w-20 h-20 text-white/60" viewBox="0 0 24 24" fill="currentColor">
            <path d={CATEGORY_ICONS[dish.category]} />
          </svg>
          {dish.isSignature && (
            <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-amber-400 text-amber-900 text-xs font-bold uppercase tracking-wider shadow-md">
              Signature Dish
            </div>
          )}
        </div>

        {/* ── Content ─────────────────────────────────────────── */}
        <div className="p-6 space-y-6">
          {/* Allergen warnings banner */}
          {warnings.length > 0 && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800">
              <svg className="w-5 h-5 text-red-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-red-700 dark:text-red-400">Allergen Warning</p>
                <p className="text-sm text-red-600 dark:text-red-400/80 mt-0.5">
                  {warnings.join("; ")}
                </p>
              </div>
            </div>
          )}

          {/* Header */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">
              {dish.name}
            </h2>
            {dish.nameOriginal && dish.nameOriginal !== dish.name && (
              <p className="text-lg text-gray-500 dark:text-gray-400 mt-0.5 font-medium">
                {dish.nameOriginal}
              </p>
            )}
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 font-medium uppercase tracking-wide">
              {country.name}
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              {dish.fullDescription || dish.description}
            </p>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-3 gap-3">
            {/* Category */}
            <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60">
              <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" viewBox="0 0 24 24" fill="currentColor">
                <path d={CATEGORY_ICONS[dish.category]} />
              </svg>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400 capitalize text-center">
                {dish.category}
              </span>
            </div>

            {/* Spice level */}
            <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60">
              <SpiceIndicator level={dish.spiceLevel} size="sm" />
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400 capitalize">
                {dish.spiceLevel}
              </span>
            </div>

            {/* Difficulty */}
            <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60">
              <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                {dish.difficulty === "easily available" && (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                )}
                {dish.difficulty === "regional" && (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
                )}
                {dish.difficulty === "rare/travel-required" && (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                )}
              </svg>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400 text-center leading-tight">
                {dish.difficulty === "easily available"
                  ? "Easy to find"
                  : dish.difficulty === "regional"
                  ? "Regional"
                  : "Rare"}
              </span>
            </div>
          </div>

          {/* Ingredients */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide mb-3">
              Key Ingredients
            </h3>
            <div className="flex flex-wrap gap-2">
              {dish.keyIngredients.map((ingredient) => {
                const isAllergen = dish.allergens.some(
                  (a) => ingredient.toLowerCase().includes(a.allergen.toLowerCase())
                );
                const isWarning = warnings.some(
                  (w) => w.toLowerCase().includes(ingredient.toLowerCase())
                );
                return (
                  <span
                    key={ingredient}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      isWarning
                        ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 ring-1 ring-red-200 dark:ring-red-800"
                        : isAllergen
                        ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 ring-1 ring-orange-200 dark:ring-orange-800"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {(isWarning || isAllergen) && (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    )}
                    {ingredient}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Allergens detail */}
          {dish.allergens.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide mb-3">
                Allergen Information
              </h3>
              <div className="space-y-1.5">
                {dish.allergens.map((a) => (
                  <div key={a.allergen} className="flex items-center gap-2 text-sm">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        a.confidence === "always"
                          ? "bg-red-500"
                          : "bg-amber-400"
                      }`}
                    />
                    <span className="capitalize text-gray-700 dark:text-gray-300 font-medium">
                      {a.allergen}
                    </span>
                    <span className="text-gray-400 dark:text-gray-500 text-xs">
                      {a.confidence === "always"
                        ? "Always contains"
                        : "May contain"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Where to find it */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide mb-2">
              Where to Find It
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              {DIFFICULTY_TEXT[dish.difficulty]?.(country.name) ??
                "Availability information not available."}
            </p>
          </div>

          {/* Divider */}
          <hr className="border-gray-100 dark:border-gray-800" />

          {/* ── User section ──────────────────────────────────── */}
          <div className="space-y-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
              Your Experience
            </h3>

            {/* Status buttons */}
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(STATUS_CONFIG) as Array<Exclude<DishStatus, "untried">>).map(
                (status) => {
                  const cfg = STATUS_CONFIG[status];
                  const isActive = entry?.status === status;
                  return (
                    <button
                      key={status}
                      onClick={() => handleStatusClick(status)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 font-medium text-sm transition-all duration-200 ${
                        isActive
                          ? cfg.activeClass
                          : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/60"
                      }`}
                    >
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={isActive ? 2.5 : 1.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d={cfg.icon} />
                      </svg>
                      {cfg.label}
                    </button>
                  );
                }
              )}
            </div>

            {/* Rating — only if tried */}
            {entry?.status === "tried" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Your Rating
                </label>
                <StarRating
                  rating={entry.rating}
                  onChange={(r) => setDishRating(dish.id, r)}
                  size="lg"
                />
                {entry.triedDate && (
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Tried on {entry.triedDate}
                  </p>
                )}
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <label
                htmlFor="dish-notes"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Personal Notes
              </label>
              <textarea
                id="dish-notes"
                rows={3}
                value={notesValue}
                onChange={(e) => setNotesValue(e.target.value)}
                onBlur={handleNotesBlur}
                placeholder="Where you had it, what you thought, recipe links..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-gray-900 dark:text-white text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400 resize-none transition-all"
              />
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Auto-saves when you click away
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
