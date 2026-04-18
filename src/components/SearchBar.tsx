import { useState, useRef, useEffect, useMemo, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../stores/appStore";
import type { DishStatus } from "../types";

type DishAction = "tried" | "want-to-try" | "skipped";

export default function SearchBar() {
  const countries = useAppStore((s) => s.countries);
  const dishes = useAppStore((s) => s.dishes);
  const userEntries = useAppStore((s) => s.userEntries);
  const setDishStatus = useAppStore((s) => s.setDishStatus);
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [justLogged, setJustLogged] = useState<number | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<number | null>(null);
  const flashTimer = useRef<number | null>(null);
  const logCloseTimer = useRef<number | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
      if (flashTimer.current) window.clearTimeout(flashTimer.current);
      if (logCloseTimer.current) window.clearTimeout(logCloseTimer.current);
    };
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return { countries: [], dishes: [] };

    const matchedCountries = countries
      .filter((c) => c.name.toLowerCase().includes(q))
      .slice(0, 5);

    const matchedDishes = dishes
      .filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.nameOriginal.toLowerCase().includes(q) ||
          d.keyIngredients.some((ing) => ing.toLowerCase().includes(q)),
      )
      .slice(0, 8);

    return { countries: matchedCountries, dishes: matchedDishes };
  }, [query, countries, dishes]);

  const hasResults = results.countries.length > 0 || results.dishes.length > 0;

  // Flat list for keyboard navigation: countries first, then dishes
  const flatItems = useMemo(
    () => [
      ...results.countries.map((c) => ({ type: "country" as const, id: c.id })),
      ...results.dishes.map((d) => ({ type: "dish" as const, id: d.id })),
    ],
    [results],
  );

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  function showToast(message: string) {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 1800);
  }

  function flashLogged(dishId: number) {
    setJustLogged(dishId);
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setJustLogged(null), 700);
  }

  function handleSelectCountry(id: number) {
    setQuery("");
    setOpen(false);
    navigate(`/country/${id}`);
  }

  function handleSelectDish(id: number) {
    setQuery("");
    setOpen(false);
    const dish = dishes.find((d) => d.id === id);
    if (dish) navigate(`/country/${dish.countryId}`);
  }

  function handleLogDish(dishId: number, status: DishAction, dishName: string) {
    setDishStatus(dishId, status);
    flashLogged(dishId);
    const verb =
      status === "tried"
        ? "Logged"
        : status === "want-to-try"
          ? "Saved"
          : "Skipped";
    const icon = status === "tried" ? "✓" : status === "want-to-try" ? "★" : "✕";
    showToast(`${verb}: ${dishName} ${icon}`);
    if (status === "tried") {
      if (logCloseTimer.current) window.clearTimeout(logCloseTimer.current);
      logCloseTimer.current = window.setTimeout(() => {
        setQuery("");
        setOpen(false);
        logCloseTimer.current = null;
      }, 250);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open || flatItems.length === 0) {
      if (e.key === "Escape") {
        setOpen(false);
        (e.target as HTMLInputElement).blur();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % flatItems.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + flatItems.length) % flatItems.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = flatItems[activeIndex];
      if (!item) return;
      if (item.type === "country") {
        handleSelectCountry(item.id);
      } else {
        const dish = dishes.find((d) => d.id === item.id);
        if (dish) handleLogDish(dish.id, "tried", dish.name);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  }

  function statusBadge(status: DishStatus | undefined) {
    if (!status || status === "untried") return null;
    if (status === "tried") {
      return (
        <span className="rounded-full bg-green-50 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">
          ✓ Tried
        </span>
      );
    }
    if (status === "want-to-try") {
      return (
        <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
          ★ Want
        </span>
      );
    }
    return (
      <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600">
        ✕ Skip
      </span>
    );
  }

  return (
    <div ref={wrapperRef} className="relative w-full max-w-md">
      {/* Search input */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search a dish or country to log..."
          className="w-full rounded-lg border border-amber-200 bg-white py-2 pl-10 pr-4 text-sm text-amber-900 placeholder-amber-300 shadow-sm outline-none transition-all focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
        />
      </div>

      {/* Toast */}
      {toast && (
        <div className="pointer-events-none absolute right-0 top-full z-[60] mt-2 animate-in fade-in slide-in-from-top-1 rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white shadow-lg">
          {toast}
        </div>
      )}

      {/* Dropdown results */}
      {open && query.trim().length >= 2 && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-amber-100 bg-white shadow-lg">
          {!hasResults && (
            <p className="px-4 py-3 text-sm text-amber-400">
              No results found
            </p>
          )}

          {results.countries.length > 0 && (
            <div>
              <p className="border-b border-amber-50 bg-amber-50/50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-amber-600">
                Countries
              </p>
              {results.countries.map((c, idx) => {
                const isActive = activeIndex === idx;
                return (
                  <button
                    key={c.id}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => handleSelectCountry(c.id)}
                    className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-amber-900 transition-colors ${
                      isActive ? "bg-amber-50" : "hover:bg-amber-50"
                    }`}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
                      {c.code}
                    </span>
                    <span>{c.name}</span>
                  </button>
                );
              })}
            </div>
          )}

          {results.dishes.length > 0 && (
            <div>
              <p className="border-b border-amber-50 bg-amber-50/50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-amber-600">
                Dishes
              </p>
              {results.dishes.map((d, idx) => {
                const flatIdx = results.countries.length + idx;
                const isActive = activeIndex === flatIdx;
                const country = countries.find((c) => c.id === d.countryId);
                const entry = userEntries.get(d.id);
                const status = entry?.status;
                const isTried = status === "tried";
                const flashing = justLogged === d.id;
                return (
                  <div
                    key={d.id}
                    onMouseEnter={() => setActiveIndex(flatIdx)}
                    className={`group flex items-center gap-2 px-3 py-2 text-sm transition-all duration-200 ${
                      isActive ? "bg-amber-50" : "hover:bg-amber-50"
                    } ${isTried ? "opacity-70" : ""} ${
                      flashing ? "ring-2 ring-green-300" : ""
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectDish(d.id)}
                      className="flex flex-1 items-center gap-3 text-left text-amber-900"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm">
                        🍽
                      </span>
                      <span className="flex min-w-0 flex-col">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate font-medium">{d.name}</span>
                          {statusBadge(status)}
                        </span>
                        {country && (
                          <span className="truncate text-xs text-amber-500">
                            {country.name}
                          </span>
                        )}
                      </span>
                    </button>

                    {/* Inline action buttons */}
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        title="Mark as tried"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLogDish(d.id, "tried", d.name);
                        }}
                        className={`flex h-7 min-w-[28px] items-center justify-center rounded-md px-1.5 text-xs font-semibold transition-all duration-200 ${
                          status === "tried"
                            ? "bg-green-600 text-white shadow-sm"
                            : "bg-green-50 text-green-700 hover:bg-green-100 hover:scale-105"
                        }`}
                      >
                        ✓
                      </button>
                      <button
                        type="button"
                        title="Want to try"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLogDish(d.id, "want-to-try", d.name);
                        }}
                        className={`flex h-7 min-w-[28px] items-center justify-center rounded-md px-1.5 text-xs font-semibold transition-all duration-200 ${
                          status === "want-to-try"
                            ? "bg-amber-500 text-white shadow-sm"
                            : "bg-amber-50 text-amber-700 hover:bg-amber-100 hover:scale-105"
                        }`}
                      >
                        ★
                      </button>
                      <button
                        type="button"
                        title="Skip"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLogDish(d.id, "skipped", d.name);
                        }}
                        className={`flex h-7 min-w-[28px] items-center justify-center rounded-md px-1.5 text-xs font-semibold transition-all duration-200 ${
                          status === "skipped"
                            ? "bg-gray-500 text-white shadow-sm"
                            : "bg-gray-50 text-gray-600 hover:bg-gray-100 hover:scale-105"
                        }`}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
              <p className="border-t border-amber-50 bg-amber-50/30 px-4 py-1 text-[10px] text-amber-500">
                ↑↓ navigate · Enter to log as tried · Esc to close
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
