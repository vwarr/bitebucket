import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../stores/appStore";
import ProgressBar from "../components/ProgressBar";
import type { Region } from "../types";

// ── Module-level scroll-restore state ──────────────────────────────
// Persists across CountryListPage unmount/remount within the same SPA session.
// Edge-swipe-to-go-back is intentionally not implemented; Tauri's webview
// does not expose iOS swipe gestures reliably.
let savedScroll = 0;
let cameFromCountryId: number | null = null;

// ── All 16 regions ──────────────────────────────────────────────────

const ALL_REGIONS: Region[] = [
  "East Asia",
  "Southeast Asia",
  "South Asia",
  "Central Asia",
  "Middle East",
  "North Africa",
  "West Africa",
  "East Africa",
  "Southern Africa",
  "Western Europe",
  "Eastern Europe",
  "Scandinavia",
  "North America",
  "Central America & Caribbean",
  "South America",
  "Oceania",
];

// ── ISO-2 to flag emoji ─────────────────────────────────────────────

function flagEmoji(code: string): string {
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

// ── Sort modes ──────────────────────────────────────────────────────

type SortMode = "alpha" | "region";

// ── Component ───────────────────────────────────────────────────────

function findScrollParent(el: HTMLElement | null): HTMLElement | null {
  let node: HTMLElement | null = el?.parentElement ?? null;
  while (node) {
    const style = window.getComputedStyle(node);
    const oy = style.overflowY;
    if ((oy === "auto" || oy === "scroll") && node.scrollHeight > node.clientHeight) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

export default function CountryListPage() {
  const navigate = useNavigate();
  const {
    countries,
    dishes,
    getCountryProgress,
    selectCountry,
    regionFilter,
    setRegionFilter,
    searchQuery,
    setSearchQuery,
  } = useAppStore();

  const [sortMode, setSortMode] = useState<SortMode>("alpha");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [pulseId, setPulseId] = useState<number | null>(null);

  // Restore scroll synchronously before paint
  useLayoutEffect(() => {
    const root = rootRef.current;
    const scroller = findScrollParent(root);
    if (savedScroll > 0) {
      if (scroller) scroller.scrollTop = savedScroll;
      else window.scrollTo(0, savedScroll);
    }
    if (cameFromCountryId !== null) {
      setPulseId(cameFromCountryId);
      const id = cameFromCountryId;
      cameFromCountryId = null;
      const t = setTimeout(() => {
        setPulseId((cur) => (cur === id ? null : cur));
      }, 1500);
      return () => clearTimeout(t);
    }
  }, []);

  // Save scroll on unmount
  useEffect(() => {
    return () => {
      const root = rootRef.current;
      const scroller = findScrollParent(root);
      savedScroll = scroller ? scroller.scrollTop : window.scrollY;
    };
  }, []);

  // Signature dish count per country
  const signatureCounts = useMemo(() => {
    const map: Record<number, number> = {};
    for (const d of dishes) {
      if (d.isSignature) map[d.countryId] = (map[d.countryId] ?? 0) + 1;
    }
    return map;
  }, [dishes]);

  // Filtered + sorted countries
  const visibleCountries = useMemo(() => {
    let list = [...countries];

    // Region filter
    if (regionFilter) {
      list = list.filter((c) => c.region === regionFilter);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.region.toLowerCase().includes(q),
      );
    }

    // Sort
    if (sortMode === "alpha") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      list.sort(
        (a, b) => a.region.localeCompare(b.region) || a.name.localeCompare(b.name),
      );
    }

    return list;
  }, [countries, regionFilter, searchQuery, sortMode]);

  return (
    <div ref={rootRef} className="max-w-6xl mx-auto px-4 py-8">
      <style>{`
        @keyframes bb-pulse-once {
          0%   { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); border-color: rgb(254, 215, 170); }
          25%  { box-shadow: 0 0 0 6px rgba(245, 158, 11, 0.45); border-color: rgb(245, 158, 11); }
          70%  { box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.2); border-color: rgb(245, 158, 11); }
          100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); border-color: rgb(254, 215, 170); }
        }
        .pulse-once {
          animation: bb-pulse-once 1.5s ease-out 1;
        }
      `}</style>
      {/* Header */}
      <h1 className="text-3xl font-bold text-gray-900 mb-1">Explore Countries</h1>
      <p className="text-gray-500 mb-6">
        Browse {countries.length} countries and track your culinary journey
      </p>

      {/* Region filter tabs */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        <button
          type="button"
          onClick={() => setRegionFilter(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
            regionFilter === null
              ? "bg-amber-500 text-white shadow-sm"
              : "bg-amber-50 text-amber-700 hover:bg-amber-100"
          }`}
        >
          All Regions
        </button>
        {ALL_REGIONS.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRegionFilter(regionFilter === r ? null : r)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
              regionFilter === r
                ? "bg-amber-500 text-white shadow-sm"
                : "bg-amber-50 text-amber-700 hover:bg-amber-100"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Search + sort bar */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
            &#x1F50D;
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search countries..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-amber-200 bg-white text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-300 transition"
          />
        </div>
        <select
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value as SortMode)}
          className="px-3 py-2.5 rounded-xl border border-amber-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-300 cursor-pointer"
        >
          <option value="alpha">A-Z</option>
          <option value="region">By Region</option>
        </select>
      </div>

      {/* Country grid */}
      {visibleCountries.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-2">&#x1F30D;</p>
          <p className="font-medium">No countries match your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {visibleCountries.map((country) => {
            const progress = getCountryProgress(country.id);
            const sigCount = signatureCounts[country.id] ?? 0;

            return (
              <button
                key={country.id}
                type="button"
                onClick={() => {
                  // Save scroll + which country we're leaving from for pulse-on-return.
                  const root = rootRef.current;
                  const scroller = findScrollParent(root);
                  savedScroll = scroller ? scroller.scrollTop : window.scrollY;
                  cameFromCountryId = country.id;
                  selectCountry(country.id);
                  navigate(`/country/${country.id}`);
                }}
                className={`text-left rounded-xl border border-amber-200 bg-white p-5 transition-all duration-200 hover:shadow-lg hover:shadow-amber-100/50 hover:-translate-y-0.5 cursor-pointer group ${
                  pulseId === country.id ? "pulse-once" : ""
                }`}
              >
                {/* Flag + name */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl leading-none">
                    {flagEmoji(country.code)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold text-gray-900 truncate group-hover:text-amber-700 transition-colors">
                      {country.name}
                    </h2>
                    <p className="text-xs text-gray-400">{country.region}</p>
                  </div>
                </div>

                {/* Progress bar */}
                <ProgressBar current={progress.tried} total={progress.total} />

                {/* Signature dishes count */}
                {sigCount > 0 && (
                  <p className="mt-2 text-xs text-amber-600 font-medium">
                    <span className="text-amber-500">&#9733;</span> {sigCount} signature{" "}
                    {sigCount === 1 ? "dish" : "dishes"}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
