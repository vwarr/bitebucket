import { useEffect, useMemo, useRef, useState } from "react";
import emailjs from "@emailjs/browser";
import { useAppStore } from "../stores/appStore";
import type { DishStatus } from "../types";

// ── Helpers ──────────────────────────────────────────────────────────

function flagEmoji(code: string): string {
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// ── Filter types ─────────────────────────────────────────────────────

type FilterKey = "all" | "untried" | "signature" | "mild";

// ── CountryBottomSheet ───────────────────────────────────────────────

export default function CountryBottomSheet() {
  const previewedCountryId = useAppStore((s) => s.previewedCountryId);
  const closePreview = useAppStore((s) => s.closePreview);
  const countries = useAppStore((s) => s.countries);
  const dishes = useAppStore((s) => s.dishes);
  const userEntries = useAppStore((s) => s.userEntries);
  const setDishStatus = useAppStore((s) => s.setDishStatus);
  const getCountryProgress = useAppStore((s) => s.getCountryProgress);
  const selectDish = useAppStore((s) => s.selectDish);
  const setLogConfirmDish = useAppStore((s) => s.setLogConfirmDish);
  const openLogSheet = useAppStore((s) => s.openLogSheet);

  // Animation state — separate from store so we can animate out before unmounting
  const [isVisible, setIsVisible] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");

  const [showSuggestForm, setShowSuggestForm] = useState(false);
  const [suggestName, setSuggestName] = useState("");
  const [suggestDesc, setSuggestDesc] = useState("");
  const [suggestStatus, setSuggestStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  // ── Derived data ────────────────────────────────────────────────────

  const country = useMemo(
    () => countries.find((c) => c.id === previewedCountryId) ?? null,
    [countries, previewedCountryId],
  );

  const allCountryDishes = useMemo(
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

  const triedCount = useMemo(
    () => allCountryDishes.filter((d) => userEntries.get(d.id)?.status === "tried").length,
    [allCountryDishes, userEntries],
  );

  const wantCount = useMemo(
    () => allCountryDishes.filter((d) => userEntries.get(d.id)?.status === "want-to-try").length,
    [allCountryDishes, userEntries],
  );

  const toGoCount = useMemo(
    () =>
      allCountryDishes.filter((d) => {
        const s = userEntries.get(d.id)?.status ?? "untried";
        return s === "untried" || s === "skipped";
      }).length,
    [allCountryDishes, userEntries],
  );

  const signatureCount = useMemo(
    () => allCountryDishes.filter((d) => d.isSignature).length,
    [allCountryDishes],
  );

  const mildCount = useMemo(
    () => allCountryDishes.filter((d) => d.spiceLevel === "mild").length,
    [allCountryDishes],
  );

  const filteredDishes = useMemo(() => {
    switch (activeFilter) {
      case "untried":
        return allCountryDishes.filter((d) => {
          const s = userEntries.get(d.id)?.status ?? "untried";
          return s === "untried";
        });
      case "signature":
        return allCountryDishes.filter((d) => d.isSignature);
      case "mild":
        return allCountryDishes.filter((d) => d.spiceLevel === "mild");
      default:
        return allCountryDishes;
    }
  }, [allCountryDishes, userEntries, activeFilter]);

  // ── Animation ───────────────────────────────────────────────────────

  useEffect(() => {
    if (previewedCountryId !== null) {
      setActiveFilter("all");
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

  // Escape key closes
  useEffect(() => {
    if (previewedCountryId === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewedCountryId]);

  const handleClose = () => {
    setIsVisible(false);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      closePreview();
      closeTimer.current = null;
    }, 300);
  };

  const handleSuggestSubmit = async () => {
    if (!suggestName.trim() || !country) return;
    setSuggestStatus("sending");
    try {
      await emailjs.send(
        import.meta.env.VITE_EMAILJS_SERVICE_ID || "default_service",
        import.meta.env.VITE_EMAILJS_TEMPLATE_ID || "default_template",
        {
          to_email: "varunswarrier@gmail.com",
          country_name: country.name,
          dish_name: suggestName.trim(),
          dish_description: suggestDesc.trim() || "(no description)",
          subject: `BiteBucket: Dish suggestion for ${country.name}`,
        },
        import.meta.env.VITE_EMAILJS_PUBLIC_KEY || ""
      );
      setSuggestStatus("sent");
      setSuggestName("");
      setSuggestDesc("");
      setTimeout(() => {
        setSuggestStatus("idle");
        setShowSuggestForm(false);
      }, 2000);
    } catch {
      setSuggestStatus("error");
      setTimeout(() => setSuggestStatus("idle"), 3000);
    }
  };

  // ── Early return ────────────────────────────────────────────────────

  if (previewedCountryId === null || !country) return null;

  const progress = getCountryProgress(country.id);

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        aria-hidden="true"
        className={`fixed inset-0 z-[2000] bg-black/40 transition-opacity duration-300 ${
          isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Bottom sheet */}
      <div
        role="dialog"
        aria-label={`${country.name} dishes`}
        aria-modal="true"
        onTouchStart={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        className={`fixed inset-x-0 bottom-0 z-[2001] flex max-h-[85dvh] flex-col rounded-t-2xl bg-[#fdfaf6] shadow-2xl transition-transform duration-300 ease-out ${
          isVisible ? "translate-y-0" : "translate-y-full"
        }`}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-stone-300" />
        </div>

        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-3 px-5 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-5xl leading-none shrink-0" aria-hidden="true">
              {flagEmoji(country.code)}
            </span>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-stone-900 leading-tight truncate">
                {country.name}
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">{country.region}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="shrink-0 mt-1 flex h-7 w-7 items-center justify-center rounded-full bg-stone-200 text-stone-600 transition-colors hover:bg-stone-300"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 6l12 12M6 18L18 6" />
            </svg>
          </button>
        </div>

        {/* ── 3-segment status bar ───────────────────────────────── */}
        <div className="mx-5 flex gap-1.5 rounded-xl border border-stone-200 p-1">
          <div className="flex flex-1 flex-col items-center rounded-lg bg-green-100 px-2 py-1.5">
            <span className="font-mono text-sm font-bold text-green-800">{triedCount}</span>
            <span className="font-mono text-[8px] uppercase tracking-wide text-green-700">Tried</span>
          </div>
          <div className="flex flex-1 flex-col items-center rounded-lg bg-amber-100 px-2 py-1.5">
            <span className="font-mono text-sm font-bold text-amber-800">{wantCount}</span>
            <span className="font-mono text-[8px] uppercase tracking-wide text-amber-700">Want</span>
          </div>
          <div className="flex flex-1 flex-col items-center rounded-lg bg-stone-100 px-2 py-1.5 border border-dashed border-stone-300">
            <span className="font-mono text-sm font-bold text-stone-700">{toGoCount}</span>
            <span className="font-mono text-[8px] uppercase tracking-wide text-stone-600">To Go</span>
          </div>
        </div>

        {/* ── Progress bar ───────────────────────────────────────── */}
        <div className="mx-5 mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="font-mono text-xs text-stone-500">Progress</span>
            <span className="font-mono text-xs font-bold text-amber-700">
              {progress.percentage}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-stone-200">
            <div
              className="h-full rounded-full bg-amber-500 transition-all duration-500"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>

        {/* ── Filter pills ───────────────────────────────────────── */}
        <div className="mx-5 mt-3 flex gap-1.5 flex-wrap">
          {(
            [
              { key: "all" as FilterKey, label: `all ${allCountryDishes.length}` },
              { key: "untried" as FilterKey, label: `untried ${toGoCount}` },
              { key: "signature" as FilterKey, label: `signature ${signatureCount}` },
              { key: "mild" as FilterKey, label: `🌶 mild ${mildCount}` },
            ] as { key: FilterKey; label: string }[]
          ).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveFilter(key)}
              className={`rounded-full border px-3 py-1 font-mono text-xs font-medium transition-colors ${
                activeFilter === key
                  ? "border-amber-500 bg-amber-500 text-white"
                  : "border-stone-300 bg-white text-stone-600 hover:border-amber-300 hover:bg-amber-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Dish list ──────────────────────────────────────────── */}
        <div className="mt-3 flex-1 overflow-y-auto px-5 pb-6">
          {filteredDishes.length === 0 ? (
            <p className="py-8 text-center text-sm text-stone-400">
              No dishes match this filter.
            </p>
          ) : (
            <>
              <p className="text-[10px] text-stone-400 px-1 mb-2">
                <span className="text-amber-400">★</span> = must-try signature dish
              </p>
            <ul className="space-y-1.5">
              {filteredDishes.map((dish) => {
                const entry = userEntries.get(dish.id);
                const status: DishStatus = entry?.status ?? "untried";
                const tried = status === "tried";
                const wantToTry = status === "want-to-try";

                if (tried) {
                  // ── Tried dish ──────────────────────────────────
                  return (
                    <li
                      key={dish.id}
                      className="flex items-center gap-3 rounded-xl bg-green-50 border border-green-100 px-3 py-2.5"
                    >
                      {/* Check circle */}
                      <button
                        type="button"
                        onClick={() => setDishStatus(dish.id, "untried")}
                        aria-label="Mark as untried"
                        className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-green-500 text-white shadow-sm transition-colors hover:bg-green-600"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>

                      {/* Dish info */}
                      <button
                        type="button"
                        onClick={() => selectDish(dish.id)}
                        className="flex-1 text-left min-w-0"
                      >
                        <p className="font-bold text-green-900 truncate text-sm">
                          {dish.name}
                          {dish.isSignature && (
                            <span className="ml-1 text-amber-500" title="Signature">★</span>
                          )}
                        </p>
                        <p className="text-xs text-green-700">
                          {entry?.rating != null && (
                            <span className="mr-1">{"★".repeat(entry.rating)}</span>
                          )}
                          {entry?.triedDate && (
                            <span>{formatDate(entry.triedDate)}</span>
                          )}
                        </p>
                      </button>
                    </li>
                  );
                }

                if (wantToTry) {
                  // ── Want-to-try dish ────────────────────────────
                  return (
                    <li
                      key={dish.id}
                      className="flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2.5"
                    >
                      {/* Pin circle */}
                      <button
                        type="button"
                        onClick={() => setDishStatus(dish.id, "untried")}
                        aria-label="Remove from want-to-try"
                        className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-amber-400 text-white shadow-sm transition-colors hover:bg-amber-500"
                      >
                        <span className="text-sm leading-none" aria-hidden="true">📌</span>
                      </button>

                      {/* Dish info */}
                      <button
                        type="button"
                        onClick={() => selectDish(dish.id)}
                        className="flex-1 text-left min-w-0"
                      >
                        <p className="font-bold text-amber-900 truncate text-sm">
                          {dish.name}
                          {dish.isSignature && (
                            <span className="ml-1 text-amber-500" title="Signature">★</span>
                          )}
                        </p>
                        <p className="text-xs text-amber-700">
                          want · {dish.category}
                        </p>
                      </button>

                      {/* Log button */}
                      <button
                        type="button"
                        onClick={() => {
                          setLogConfirmDish(dish.id);
                          openLogSheet();
                        }}
                        className="shrink-0 rounded-full border border-amber-400 px-2.5 py-1 font-mono text-xs font-bold text-amber-700 transition-colors hover:bg-amber-400 hover:text-white"
                      >
                        log
                      </button>
                    </li>
                  );
                }

                // ── Untried dish ──────────────────────────────────
                return (
                  <li
                    key={dish.id}
                    className="flex items-center gap-3 rounded-xl border border-dashed border-stone-300 bg-white px-3 py-2.5 hover:bg-stone-50 transition-colors"
                  >
                    {/* Empty circle */}
                    <button
                      type="button"
                      onClick={() => setDishStatus(dish.id, "tried")}
                      aria-label="Mark as tried"
                      className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-stone-300 bg-white text-transparent transition-colors hover:border-green-400 hover:bg-green-50"
                    >
                      <svg className="h-4 w-4 text-stone-300" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>

                    {/* Dish info */}
                    <button
                      type="button"
                      onClick={() => selectDish(dish.id)}
                      className="flex-1 text-left min-w-0"
                    >
                      <p className="text-sm text-stone-800 truncate">
                        {dish.name}
                        {dish.isSignature && (
                          <span className="ml-1 text-amber-400" title="Signature">★</span>
                        )}
                      </p>
                      <p className="text-xs text-stone-400">{dish.category}</p>
                    </button>

                    {/* Log button */}
                    <button
                      type="button"
                      onClick={() => {
                        setLogConfirmDish(dish.id);
                        openLogSheet();
                      }}
                      className="shrink-0 rounded-full border border-stone-300 px-2.5 py-1 font-mono text-xs font-medium text-stone-500 transition-colors hover:border-amber-400 hover:bg-amber-50 hover:text-amber-700"
                    >
                      log
                    </button>
                  </li>
                );
              })}
            </ul>
            </>
          )}

          {/* Drag up hint */}
          {filteredDishes.length > 0 && (
            <p className="mt-4 text-center font-mono text-xs text-stone-400">
              drag up for all {allCountryDishes.length} dishes ↑
            </p>
          )}

          {/* Suggest a dish */}
          <div className="mt-4 pt-3 border-t border-gray-200">
            {!showSuggestForm ? (
              <button
                type="button"
                onClick={() => setShowSuggestForm(true)}
                className="w-full py-2.5 text-sm font-medium text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-xl transition-colors"
              >
                + Suggest a dish for {country.name}
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-bold tracking-widest text-amber-600 uppercase">
                  Suggest a Dish
                </p>
                <input
                  type="text"
                  value={suggestName}
                  onChange={(e) => setSuggestName(e.target.value)}
                  placeholder="Dish name"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                />
                <textarea
                  value={suggestDesc}
                  onChange={(e) => setSuggestDesc(e.target.value)}
                  placeholder="Brief description (optional)"
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setShowSuggestForm(false); setSuggestName(""); setSuggestDesc(""); }}
                    className="flex-1 py-2 text-sm text-gray-500 hover:text-gray-700 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSuggestSubmit}
                    disabled={!suggestName.trim() || suggestStatus === "sending"}
                    className="flex-1 py-2 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                  >
                    {suggestStatus === "sending" ? "Sending…" : suggestStatus === "sent" ? "✓ Sent!" : suggestStatus === "error" ? "Failed – retry?" : "Submit"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
