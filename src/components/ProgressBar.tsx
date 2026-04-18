interface ProgressBarProps {
  current: number;
  total: number;
  label?: string;
}

export default function ProgressBar({ current, total, label }: ProgressBarProps) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="w-full">
      {label && (
        <p className="text-xs font-medium text-amber-800/70 mb-1">{label}</p>
      )}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2.5 bg-amber-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${pct}%`,
              background: "linear-gradient(90deg, #f59e0b, #22c55e)",
            }}
          />
        </div>
        <span className="text-xs font-semibold text-amber-700 tabular-nums whitespace-nowrap">
          {current}/{total} ({pct}%)
        </span>
      </div>
    </div>
  );
}
