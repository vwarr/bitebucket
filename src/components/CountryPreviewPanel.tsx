import { useEffect, useMemo, useRef, useState } from "react";
import { useAppStore } from "../stores/appStore";
import type { DishStatus } from "../types";

function flagEmoji(code: string): string {
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

export default function CountryPreviewPanel() {
  const previewedCountryId = useAppStore((s) => s.previewedCountryId);
  const closePreview = useAppStore((s) => s.closePreview);
  const countries = useAppStore((s) => s.countries);
  const dishes = useAppStore((s) => s.dishes);
  const userEntries = useAppStore((s) => s.userEntries);
  const setDishStatus = useAppStore((s) => s.setDishStatus);
  const getCountryProgress = useAppStore((s) => s.getCountryProgress);
  const selectDish = useAppStore((s) => s.selectDish);

  const [isVisible, setIsVisible] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const country = useMemo(
    () => countries.find((c) => c.id === previewedCountryId) ?? null,
    [countries, previewedCountryId],
  );

  const countryDishes = useMemo(
    () =>
      previewedCountryId !== null
        ? dishes
            .filter((d) => d.countryId === previewedCountryId)
            .sort(
              (a, b) =>
                Number(b.isSignature) - Number(a.isSignature) ||
                a.name.localeCompare(b.name),
            )
        : [],
    [dishes, previewedCountryId],
  );

  // Animate open/close
  useEffect(() => {
    if (previewedCountryId !== null) {
      const id = requestAnimationFrame(() => setIsVisible(true));
      return () => cancelAnimationFrame(id);
    } else {
      setIsVisible(false);
    }
  }, [previewedCountryId]);

  // Clear pending close timer when a new country is previewed
  useEffect(() => {
    if (previewedCountryId !== null && closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, [previewedCountryId]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  // Esc key closes
  useEffect(() => {
    if (previewedCountryId === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsVisible(false);
        closeTimer.current = setTimeout(() => {
          closePreview();
          closeTimer.current = null;
        }, 300);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [previewedCountryId, closePreview]);

  const handleClose = () => {
    setIsVisible(false);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      closePreview();
      closeTimer.current = null;
    }, 300);
  };

  if (previewedCountryId === null || !country) return null;

  const progress = getCountryProgress(country.id);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        className={`fixed inset-0 z-[2000] bg-black/30 backdrop-blur-sm transition-opacity duration-300 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Panel */}
      <aside
        className={`fixed right-0 top-0 z-[2001] h-full w-full max-w-md bg-white shadow-2xl transition-transform duration-300 ease-out flex flex-col ${
          isVisible ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-label={`${country.name} dishes`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-amber-100 bg-gradient-to-br from-amber-50 to-orange-50 px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="text-4xl leading-none">{flagEmoji(country.code)}</span>
            <div>
              <h2 className="text-xl font-bold text-amber-900">{country.name}</h2>
              <p className="text-xs text-amber-600">{country.region}</p>
              <p className="mt-1.5 text-sm font-medium text-amber-800">
                {progress.tried} of {progress.total} dishes tried ({progress.percentage}%)
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="rounded-full p-1.5 text-amber-500 hover:bg-white/60 transition-colors"
            aria-label="Close"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6l12 12M6 18L18 6" />
            </svg>
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 w-full bg-amber-100">
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-green-500 transition-all duration-500"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>

        {/* Dish list */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {countryDishes.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-gray-400">
              No dishes available yet for this country.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {countryDishes.map((dish) => {
                const entry = userEntries.get(dish.id);
                const status: DishStatus = entry?.status ?? "untried";
                const tried = status === "tried";

                return (
                  <li
                    key={dish.id}
                    className={`group flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 transition-all hover:border-amber-200 hover:bg-amber-50/50 ${
                      tried ? "bg-green-50/40" : ""
                    }`}
                  >
                    {/* Checkbox toggle */}
                    <button
                      type="button"
                      onClick={() => setDishStatus(dish.id, tried ? "untried" : "tried")}
                      className={`shrink-0 flex h-6 w-6 items-center justify-center rounded-md border-2 transition-all ${
                        tried
                          ? "border-green-500 bg-green-500 text-white"
                          : "border-amber-300 hover:border-green-400 hover:bg-green-50"
                      }`}
                      aria-label={tried ? "Mark as untried" : "Mark as tried"}
                    >
                      {tried && (
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>

                    {/* Dish name - clickable to open detail */}
                    <button
                      type="button"
                      onClick={() => selectDish(dish.id)}
                      className="flex-1 text-left min-w-0"
                    >
                      <p className={`font-medium truncate ${tried ? "text-green-800" : "text-amber-900"}`}>
                        {dish.name}
                        {dish.isSignature && (
                          <span className="ml-1.5 text-amber-500" title="Signature">★</span>
                        )}
                      </p>
                      {dish.nameOriginal && dish.nameOriginal !== dish.name && (
                        <p className="text-xs text-gray-400 truncate">{dish.nameOriginal}</p>
                      )}
                    </button>

                    {/* Want-to-try and Skip secondary actions */}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() =>
                          setDishStatus(dish.id, status === "want-to-try" ? "untried" : "want-to-try")
                        }
                        className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                          status === "want-to-try"
                            ? "bg-amber-500 text-white"
                            : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                        }`}
                        title="Want to try"
                      >
                        ★
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setDishStatus(dish.id, status === "skipped" ? "untried" : "skipped")
                        }
                        className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                          status === "skipped"
                            ? "bg-gray-500 text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                        title="Skip"
                      >
                        ✕
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>
    </>
  );
}
