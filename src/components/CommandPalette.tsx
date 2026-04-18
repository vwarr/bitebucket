import { useEffect, useRef, useState, useCallback } from "react";
import { useAppStore } from "../stores/appStore";
import type { Dish, Country } from "../types";

// ── Helpers ──────────────────────────────────────────────────────────

function flagEmoji(code: string): string {
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

// ── Result types ─────────────────────────────────────────────────────

type DishResult = { kind: "dish"; dish: Dish; country: Country | undefined };
type CountryResult = { kind: "country"; country: Country; tried: number; total: number };
type Result = DishResult | CountryResult;

// ── Component ────────────────────────────────────────────────────────

export default function CommandPalette() {
  const showCommandPalette = useAppStore((s) => s.showCommandPalette);
  const closeCommandPalette = useAppStore((s) => s.closeCommandPalette);
  const openCommandPalette = useAppStore((s) => s.openCommandPalette);
  const dishes = useAppStore((s) => s.dishes);
  const countries = useAppStore((s) => s.countries);
  const userEntries = useAppStore((s) => s.userEntries);
  const setLogConfirmDish = useAppStore((s) => s.setLogConfirmDish);
  const openLogSheet = useAppStore((s) => s.openLogSheet);
  const previewCountry = useAppStore((s) => s.previewCountry);
  const getCountryProgress = useAppStore((s) => s.getCountryProgress);

  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

  // ── Global ⌘K / Ctrl+K shortcut ──────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (showCommandPalette) closeCommandPalette();
        else openCommandPalette();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showCommandPalette, openCommandPalette, closeCommandPalette]);

  // ── Reset state on open ───────────────────────────────────────────

  useEffect(() => {
    if (showCommandPalette) {
      setQuery("");
      setActiveIndex(0);
      // Auto-focus after the DOM paints
      const t = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(t);
    }
  }, [showCommandPalette]);

  // ── Build results ─────────────────────────────────────────────────

  const results: Result[] = (() => {
    const q = query.trim().toLowerCase();

    const dishResults: DishResult[] = dishes
      .filter((d) => {
        if (!q) return false;
        return (
          d.name.toLowerCase().includes(q) ||
          d.keyIngredients.some((i) => i.toLowerCase().includes(q))
        );
      })
      .slice(0, 5)
      .map((d) => ({
        kind: "dish",
        dish: d,
        country: countries.find((c) => c.id === d.countryId),
      }));

    const countryResults: CountryResult[] = countries
      .filter((c) => {
        if (!q) return false;
        return c.name.toLowerCase().includes(q);
      })
      .slice(0, 3)
      .map((c) => {
        const { tried, total } = getCountryProgress(c.id);
        return { kind: "country", country: c, tried, total };
      });

    return [...dishResults, ...countryResults];
  })();

  // Keep activeIndex in range when results change
  useEffect(() => {
    setActiveIndex((prev) => Math.min(prev, Math.max(results.length - 1, 0)));
  }, [results.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Keyboard navigation ───────────────────────────────────────────

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        closeCommandPalette();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, results.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const result = results[activeIndex];
        if (result) selectResult(result);
      }
    },
    [results, activeIndex], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const selectResult = useCallback(
    (result: Result) => {
      if (result.kind === "dish") {
        setLogConfirmDish(result.dish.id);
        openLogSheet();
        closeCommandPalette();
      } else {
        previewCountry(result.country.id);
        closeCommandPalette();
      }
    },
    [setLogConfirmDish, openLogSheet, closeCommandPalette, previewCountry],
  );

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) closeCommandPalette();
  };

  if (!showCommandPalette) return null;

  // Split results into groups for display
  const dishResults = results.filter((r): r is DishResult => r.kind === "dish");
  const countryResults = results.filter((r): r is CountryResult => r.kind === "country");

  // Compute absolute index within the combined list for keyboard highlight
  const absoluteIndex = (r: Result): number => results.indexOf(r);

  return (
    <div
      className="fixed inset-0 z-[4000] flex items-start justify-center pt-[15vh] px-4 bg-black/40 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      {/* Card */}
      <div
        className="w-full max-w-[520px] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-amber-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-amber-100">
          <svg
            className="w-5 h-5 text-amber-400 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search dishes, countries, or ingredients…"
            className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Clear"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] font-mono text-gray-500">
            ESC
          </kbd>
        </div>

        {/* Results */}
        {query.trim() === "" ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-gray-400">Type to search dishes, countries, or ingredients</p>
            <p className="text-xs text-gray-300 mt-1">Use ↑↓ to navigate · Enter to select · Esc to close</p>
          </div>
        ) : results.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-gray-400">No results for "{query}"</p>
          </div>
        ) : (
          <div className="overflow-y-auto max-h-[360px]">
            {/* DISHES group */}
            {dishResults.length > 0 && (
              <div>
                <p className="sticky top-0 z-10 bg-gray-50 px-4 py-1.5 text-[10px] font-bold tracking-widest text-gray-400 uppercase border-b border-gray-100">
                  Dishes
                </p>
                <ul>
                  {dishResults.map((r) => {
                    const idx = absoluteIndex(r);
                    const entry = userEntries.get(r.dish.id);
                    const tried = entry?.status === "tried";
                    return (
                      <li key={r.dish.id}>
                        <button
                          type="button"
                          className={`w-full text-left flex items-center gap-3 px-4 py-2.5 transition-colors ${
                            activeIndex === idx
                              ? "bg-amber-50"
                              : "hover:bg-gray-50"
                          }`}
                          onMouseEnter={() => setActiveIndex(idx)}
                          onClick={() => selectResult(r)}
                        >
                          {/* Flag as thumbnail */}
                          <span className="text-xl leading-none w-8 h-8 flex items-center justify-center rounded-lg bg-amber-50 shrink-0">
                            {r.country ? flagEmoji(r.country.code) : "🍽️"}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {r.dish.name}
                              {r.dish.isSignature && (
                                <span className="ml-1 text-amber-500 text-xs">★</span>
                              )}
                              {tried && (
                                <span className="ml-1.5 text-green-500 text-xs">✓</span>
                              )}
                            </p>
                            <p className="text-xs text-gray-400 truncate mt-0.5">
                              {r.country ? r.country.name : ""}
                              {" · "}
                              <span className="capitalize">{r.dish.category}</span>
                            </p>
                          </div>
                          {activeIndex === idx && (
                            <span className="text-[10px] text-amber-500 font-medium shrink-0">
                              Log
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* COUNTRIES group */}
            {countryResults.length > 0 && (
              <div>
                <p className="sticky top-0 z-10 bg-gray-50 px-4 py-1.5 text-[10px] font-bold tracking-widest text-gray-400 uppercase border-y border-gray-100">
                  Countries
                </p>
                <ul>
                  {countryResults.map((r) => {
                    const idx = absoluteIndex(r);
                    const pct =
                      r.total > 0
                        ? Math.round((r.tried / r.total) * 100)
                        : 0;
                    return (
                      <li key={r.country.id}>
                        <button
                          type="button"
                          className={`w-full text-left flex items-center gap-3 px-4 py-2.5 transition-colors ${
                            activeIndex === idx
                              ? "bg-amber-50"
                              : "hover:bg-gray-50"
                          }`}
                          onMouseEnter={() => setActiveIndex(idx)}
                          onClick={() => selectResult(r)}
                        >
                          {/* Flag */}
                          <span className="text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-lg bg-amber-50 shrink-0">
                            {flagEmoji(r.country.code)}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {r.country.name}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {r.country.region}
                              {" · "}
                              {r.tried}/{r.total} dishes
                              {r.tried > 0 && (
                                <span className="ml-1 text-amber-500">({pct}%)</span>
                              )}
                            </p>
                          </div>
                          {/* Progress bar */}
                          <div className="w-14 h-1.5 bg-amber-100 rounded-full overflow-hidden shrink-0">
                            <div
                              className="h-full bg-amber-400 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Footer hint */}
        {results.length > 0 && (
          <div className="flex items-center gap-4 px-4 py-2 border-t border-gray-100 bg-gray-50">
            <span className="text-[10px] text-gray-400 flex items-center gap-1">
              <kbd className="rounded border border-gray-200 bg-white px-1 py-0.5 font-mono text-[9px]">↑↓</kbd>
              navigate
            </span>
            <span className="text-[10px] text-gray-400 flex items-center gap-1">
              <kbd className="rounded border border-gray-200 bg-white px-1 py-0.5 font-mono text-[9px]">↵</kbd>
              select
            </span>
            <span className="text-[10px] text-gray-400 flex items-center gap-1">
              <kbd className="rounded border border-gray-200 bg-white px-1 py-0.5 font-mono text-[9px]">esc</kbd>
              close
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
