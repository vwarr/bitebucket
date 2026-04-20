import { useAppStore } from "../stores/appStore";

// ── FloatingLogPill ──────────────────────────────────────────────────
// Fixed pill button that floats above the bottom tab bar.
// Tapping it opens the log-a-dish sheet.

export default function FloatingLogPill() {
  const openLogSheet = useAppStore((s) => s.openLogSheet);

  return (
    <button
      type="button"
      onClick={openLogSheet}
      aria-label="Log a dish"
      className="fixed left-1/2 z-[40] -translate-x-1/2 cursor-pointer select-none transition-transform hover:scale-105"
      style={{
        bottom: "calc(72px + env(safe-area-inset-bottom, 0px))",
        background: "#1a1a1a",
        color: "#fbf8f2",
        borderRadius: "9999px",
        padding: "12px 20px",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        fontSize: "0.875rem",
        fontWeight: 700,
        boxShadow: "2px 2px 0 #b45309, 0 4px 12px rgba(0,0,0,0.15)",
      }}
    >
      {/* Orange "+" circle */}
      <span
        aria-hidden="true"
        className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-sm text-white"
      >
        +
      </span>
      log a dish
    </button>
  );
}
