import { useState } from "react";
import type { SpiceLevel } from "../types";

interface SpiceIndicatorProps {
  level: SpiceLevel;
  size?: "sm" | "md" | "lg";
}

const SPICE_CONFIG: Record<
  SpiceLevel,
  { count: number; color: string; label: string }
> = {
  mild: { count: 1, color: "text-green-500", label: "Mild" },
  medium: { count: 2, color: "text-yellow-500", label: "Medium" },
  hot: { count: 3, color: "text-orange-500", label: "Hot" },
  extreme: { count: 4, color: "text-red-500", label: "Extreme" },
};

const SIZE_MAP = {
  sm: "w-3.5 h-3.5",
  md: "w-4.5 h-4.5",
  lg: "w-5.5 h-5.5",
};

function PepperIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 2C11 2 10.5 3 10.5 3L9.5 5C7 5 5 7 5 9.5C5 14 8 19 12 22C16 19 19 14 19 9.5C19 7 17 5 14.5 5L13.5 3C13.5 3 13 2 12 2ZM12 4.5L12.8 6H11.2L12 4.5ZM12 8C13.1 8 14 8.9 14 10C14 11.1 13.1 12 12 12C10.9 12 10 11.1 10 10C10 8.9 10.9 8 12 8Z" />
    </svg>
  );
}

export default function SpiceIndicator({
  level,
  size = "md",
}: SpiceIndicatorProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const config = SPICE_CONFIG[level];
  const iconSize = SIZE_MAP[size];

  return (
    <div
      className="relative inline-flex items-center gap-0.5"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <PepperIcon
          key={i}
          className={`${iconSize} transition-colors ${
            i < config.count ? config.color : "text-gray-200 dark:text-gray-700"
          }`}
        />
      ))}

      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 rounded-md bg-gray-900 text-white text-xs font-medium whitespace-nowrap shadow-lg pointer-events-none z-50">
          {config.label}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
}
