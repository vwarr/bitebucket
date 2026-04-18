import { useAppStore } from "../stores/appStore";

// ── StatusStrip ──────────────────────────────────────────────────────
// Overlay at the top of the map showing 3 chunky status segments:
// Complete, Started, To Go.

export default function StatusStrip() {
  const getCountriesByStatus = useAppStore((s) => s.getCountriesByStatus);
  const { completed, started, toGo } = getCountriesByStatus();

  return (
    <div className="absolute left-3 right-3 top-[60px] z-[1000] flex gap-1 rounded-lg border border-stone-200 bg-white/97 p-1.5 shadow">
      {/* Complete */}
      <div className="flex flex-1 flex-col items-center rounded bg-green-100 p-2 text-center">
        <span className="font-mono text-base font-bold text-green-800">
          {completed}
        </span>
        <div className="mt-0.5 flex items-center gap-1">
          <span
            className="inline-block h-2 w-2 rounded-full border border-green-600 bg-green-500"
            aria-hidden="true"
          />
          <span className="font-mono text-[8px] uppercase tracking-wide text-gray-600">
            Complete
          </span>
        </div>
      </div>

      {/* Started */}
      <div className="flex flex-1 flex-col items-center rounded bg-amber-100 p-2 text-center">
        <span className="font-mono text-base font-bold text-amber-800">
          {started}
        </span>
        <div className="mt-0.5 flex items-center gap-1">
          <span
            className="inline-block h-2 w-2 rounded-full border border-amber-600 bg-amber-500"
            aria-hidden="true"
          />
          <span className="font-mono text-[8px] uppercase tracking-wide text-gray-600">
            Started
          </span>
        </div>
      </div>

      {/* To Go */}
      <div className="flex flex-1 flex-col items-center rounded bg-stone-100 p-2 text-center">
        <span className="font-mono text-base font-bold text-stone-700">
          {toGo}
        </span>
        <div className="mt-0.5 flex items-center gap-1">
          <span
            className="inline-block h-2 w-2 rounded-full border border-stone-400 bg-white"
            aria-hidden="true"
          />
          <span className="font-mono text-[8px] uppercase tracking-wide text-gray-600">
            To Go
          </span>
        </div>
      </div>
    </div>
  );
}
