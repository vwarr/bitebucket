import { useAppStore } from "../stores/appStore";
import type { Dish, DishStatus, DishCategory, SpiceLevel } from "../types";

// ── Helpers ─────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<DishCategory, string> = {
  appetizer: "bg-lime-100 text-lime-800",
  main: "bg-amber-100 text-amber-800",
  dessert: "bg-pink-100 text-pink-800",
  "street food": "bg-orange-100 text-orange-800",
  beverage: "bg-sky-100 text-sky-800",
  snack: "bg-violet-100 text-violet-800",
};

const SPICE_COUNT: Record<SpiceLevel, number> = {
  mild: 1,
  medium: 2,
  hot: 3,
  extreme: 4,
};

const DIFFICULTY_COLORS: Record<string, string> = {
  "easily available": "bg-green-100 text-green-700",
  regional: "bg-yellow-100 text-yellow-700",
  "rare/travel-required": "bg-red-100 text-red-700",
};

// ── Props ───────────────────────────────────────────────────────────

interface DishCardProps {
  dish: Dish;
  /** Optionally show the country name on the card */
  countryName?: string;
}

// ── Component ───────────────────────────────────────────────────────

export default function DishCard({ dish, countryName }: DishCardProps) {
  const { userEntries, setDishStatus, selectDish, isDishFiltered, getDishWarnings } =
    useAppStore();

  const entry = userEntries.get(dish.id);
  const status: DishStatus = entry?.status ?? "untried";
  const filtered = isDishFiltered(dish);
  const warnings = getDishWarnings(dish);

  function cycleStatus(target: DishStatus) {
    // Toggle off if already set, otherwise set
    const next = status === target ? "untried" : target;
    setDishStatus(dish.id, next);
  }

  return (
    <div
      className={`relative rounded-xl border transition-all duration-200 ${
        filtered
          ? "border-gray-200 bg-gray-50 opacity-60"
          : "border-amber-200 bg-white hover:shadow-lg hover:shadow-amber-100/50 hover:-translate-y-0.5"
      }`}
    >
      {/* Warning overlay for filtered dishes */}
      {filtered && warnings.length > 0 && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-gray-900/10 backdrop-blur-[1px]">
          <div className="bg-white/90 rounded-lg px-3 py-2 shadow text-xs text-red-600 font-medium max-w-[80%] text-center">
            {warnings.map((w, i) => (
              <p key={i}>{w}</p>
            ))}
          </div>
        </div>
      )}

      {/* Clickable card body */}
      <button
        type="button"
        className="w-full text-left p-4 pb-2 cursor-pointer"
        onClick={() => selectDish(dish.id)}
      >
        {/* Top row: name + signature */}
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate leading-snug">
              {dish.name}
              {dish.isSignature && (
                <span className="ml-1.5 text-amber-500" title="Signature dish">
                  &#9733;
                </span>
              )}
            </h3>
            {dish.nameOriginal && dish.nameOriginal !== dish.name && (
              <p className="text-xs text-gray-400 truncate">{dish.nameOriginal}</p>
            )}
          </div>
        </div>

        {/* Country name (when shown in category view) */}
        {countryName && (
          <p className="text-xs text-amber-600 mt-1 font-medium">{countryName}</p>
        )}

        {/* Description */}
        <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">
          {dish.description}
        </p>

        {/* Tags row */}
        <div className="flex flex-wrap items-center gap-1.5 mt-3">
          {/* Category pill */}
          <span
            className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${CATEGORY_COLORS[dish.category]}`}
          >
            {dish.category}
          </span>

          {/* Difficulty badge */}
          <span
            className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${DIFFICULTY_COLORS[dish.difficulty]}`}
          >
            {dish.difficulty}
          </span>

          {/* Spice level peppers */}
          <span className="text-xs ml-auto" title={`Spice: ${dish.spiceLevel}`}>
            {Array.from({ length: SPICE_COUNT[dish.spiceLevel] }, (_, i) => (
              <span key={i} className="text-red-500">
                &#x1F336;&#xFE0F;
              </span>
            ))}
          </span>
        </div>
      </button>

      {/* Status toggle buttons */}
      <div className="flex items-center border-t border-amber-100 divide-x divide-amber-100">
        <StatusButton
          label="Tried"
          icon={"\u2713"}
          active={status === "tried"}
          activeClass="text-green-600 bg-green-50"
          onClick={() => cycleStatus("tried")}
        />
        <StatusButton
          label="Want"
          icon={"\u2605"}
          active={status === "want-to-try"}
          activeClass="text-amber-600 bg-amber-50"
          onClick={() => cycleStatus("want-to-try")}
        />
        <StatusButton
          label="Skip"
          icon={"\u2715"}
          active={status === "skipped"}
          activeClass="text-red-500 bg-red-50"
          onClick={() => cycleStatus("skipped")}
        />
      </div>
    </div>
  );
}

// ── Sub-component ───────────────────────────────────────────────────

function StatusButton({
  label,
  icon,
  active,
  activeClass,
  onClick,
}: {
  label: string;
  icon: string;
  active: boolean;
  activeClass: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium transition-colors cursor-pointer ${
        active ? activeClass : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
      }`}
    >
      <span className="text-sm">{icon}</span>
      {label}
    </button>
  );
}
