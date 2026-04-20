import { useAppStore } from "../stores/appStore";

// ── StatusStrip ──────────────────────────────────────────────────────
// Overlay at the top of the map showing 3 chunky status segments:
// Complete, Started, To Go.

export default function StatusStrip() {
  const getCountriesByStatus = useAppStore((s) => s.getCountriesByStatus);
  const { completed, started, toGo } = getCountriesByStatus();

  return (
    <div className="flex gap-1 rounded-xl border border-white/20 bg-white/75 p-1 shadow-lg backdrop-blur-md">
      {/* Complete */}
      <div className="flex flex-1 flex-col items-center rounded-lg bg-green-500/15 px-2 py-1.5 text-center">
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
      </div>

      {/* Started */}
      <div className="flex flex-1 flex-col items-center rounded-lg bg-amber-500/15 px-2 py-1.5 text-center">
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
      </div>

      {/* To Go */}
      <div className="flex flex-1 flex-col items-center rounded-lg bg-stone-500/10 px-2 py-1.5 text-center">
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
      </div>
    </div>
  );
}
