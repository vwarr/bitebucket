import { useState, useRef, useEffect } from "react";
import { useAppStore } from "../stores/appStore";

// ── StatusStrip ──────────────────────────────────────────────────────
// Overlay at the top of the map showing 3 clickable status segments:
// Done, Started, To Go. Clicking a segment opens a dropdown list of
// the countries in that bucket. Clicking a country previews it.

function flagEmoji(code: string): string {
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

type Segment = "done" | "started" | "togo";

export default function StatusStrip() {
  const getCountriesByStatus = useAppStore((s) => s.getCountriesByStatus);
  const getCountriesByStatusList = useAppStore((s) => s.getCountriesByStatusList);
  const previewCountry = useAppStore((s) => s.previewCountry);
  const { completed, started, toGo } = getCountriesByStatus();

  const [activeSegment, setActiveSegment] = useState<Segment | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Click outside to close
  useEffect(() => {
    if (!activeSegment) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActiveSegment(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [activeSegment]);

  const handleSegmentClick = (segment: Segment) => {
    setActiveSegment((prev) => (prev === segment ? null : segment));
  };

  const handleCountryClick = (countryId: number) => {
    setActiveSegment(null);
    previewCountry(countryId);
  };

  // Get country lists only when dropdown is open
  const countryLists = activeSegment ? getCountriesByStatusList() : null;
  const activeCountries =
    activeSegment === "done"
      ? countryLists?.completed
      : activeSegment === "started"
      ? countryLists?.started
      : countryLists?.toGo;

  return (
    <div ref={containerRef} className="relative">
      <div className="flex gap-1 rounded-xl border border-white/20 bg-white/75 p-1 shadow-lg backdrop-blur-md">
        {/* Done segment */}
        <button
          type="button"
          onClick={() => handleSegmentClick("done")}
          className={`flex flex-1 flex-col items-center rounded-lg px-2 py-1.5 text-center transition-colors ${
            activeSegment === "done"
              ? "bg-green-500/30 ring-1 ring-green-500/50"
              : "bg-green-500/15"
          }`}
        >
          <span className="font-mono text-sm font-bold leading-none text-green-800">
            {completed}
          </span>
          <div className="mt-0.5 flex items-center gap-1">
            <span
              className="inline-block h-1.5 w-1.5 rounded-full border border-green-600 bg-green-500"
              aria-hidden="true"
            />
            <span className="font-mono text-[8px] uppercase tracking-wide text-gray-600">
              Done
            </span>
          </div>
        </button>

        {/* Started segment */}
        <button
          type="button"
          onClick={() => handleSegmentClick("started")}
          className={`flex flex-1 flex-col items-center rounded-lg px-2 py-1.5 text-center transition-colors ${
            activeSegment === "started"
              ? "bg-amber-500/30 ring-1 ring-amber-500/50"
              : "bg-amber-500/15"
          }`}
        >
          <span className="font-mono text-sm font-bold leading-none text-amber-800">
            {started}
          </span>
          <div className="mt-0.5 flex items-center gap-1">
            <span
              className="inline-block h-1.5 w-1.5 rounded-full border border-amber-600 bg-amber-500"
              aria-hidden="true"
            />
            <span className="font-mono text-[8px] uppercase tracking-wide text-gray-600">
              Started
            </span>
          </div>
        </button>

        {/* To Go segment */}
        <button
          type="button"
          onClick={() => handleSegmentClick("togo")}
          className={`flex flex-1 flex-col items-center rounded-lg px-2 py-1.5 text-center transition-colors ${
            activeSegment === "togo"
              ? "bg-stone-500/20 ring-1 ring-stone-400/50"
              : "bg-stone-500/10"
          }`}
        >
          <span className="font-mono text-sm font-bold leading-none text-stone-700">
            {toGo}
          </span>
          <div className="mt-0.5 flex items-center gap-1">
            <span
              className="inline-block h-1.5 w-1.5 rounded-full border border-stone-400 bg-white"
              aria-hidden="true"
            />
            <span className="font-mono text-[8px] uppercase tracking-wide text-gray-600">
              To Go
            </span>
          </div>
        </button>
      </div>

      {/* Dropdown */}
      {activeSegment && activeCountries && (
        <div className="absolute top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto overscroll-contain rounded-xl bg-white/95 backdrop-blur-md shadow-lg border border-gray-200 z-20">
          {activeCountries.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-400 text-center italic">
              No countries yet
            </p>
          ) : (
            activeCountries.map((country) => (
              <button
                key={country.id}
                type="button"
                onClick={() => handleCountryClick(country.id)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-amber-50 transition-colors border-b border-gray-100 last:border-0"
              >
                <span className="text-base">{flagEmoji(country.code)}</span>
                <span className="text-gray-900 font-medium">{country.name}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
