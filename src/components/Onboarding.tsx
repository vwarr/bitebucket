import { useState, useMemo } from "react";
import { useAppStore } from "../stores/appStore";
import type { AllergenType, DietaryRestriction, SpiceLevel } from "../types";

// ── Helpers ───────────────────────────────────────────────────────────

function flagEmoji(code: string): string {
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

// ── Constants ─────────────────────────────────────────────────────────

const ALLERGEN_PILLS: { value: AllergenType; label: string; emoji: string }[] =
  [
    { value: "peanuts", label: "Peanuts", emoji: "🥜" },
    { value: "gluten", label: "Gluten", emoji: "🌾" },
    { value: "dairy", label: "Dairy", emoji: "🥛" },
    { value: "shellfish", label: "Shellfish", emoji: "🦐" },
    { value: "tree-nuts", label: "Tree nuts", emoji: "🌰" },
    { value: "fish", label: "Fish", emoji: "🐟" },
    { value: "soy", label: "Soy", emoji: "🫘" },
    { value: "eggs", label: "Eggs", emoji: "🥚" },
    { value: "sesame", label: "Sesame", emoji: "🌱" },
  ];

const DIET_PILLS: { value: DietaryRestriction | "none"; label: string }[] = [
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "halal", label: "Halal" },
  { value: "kosher", label: "Kosher" },
  { value: "none", label: "None" },
];

const SPICE_LEVELS: { value: SpiceLevel; label: string; display: string }[] = [
  { value: "mild", label: "Mild", display: "mild" },
  { value: "medium", label: "Medium", display: "🌶🌶" },
  { value: "hot", label: "Hot", display: "🌶🌶🌶" },
  { value: "extreme", label: "Extreme", display: "🌶🌶🌶🌶" },
];

const SPICE_INDEX: Record<SpiceLevel, number> = {
  mild: 0,
  medium: 1,
  hot: 2,
  extreme: 3,
};

const MAX_CLASSICS = 30;
const TOTAL_STEPS = 6;
// Step indices:
// 0 = Allergens, 1 = Diet/Spice, 2 = Log explainer, 3 = Want explainer,
// 4 = Skip explainer, 5 = Pre-check classics
const STEP_LOG = 2;
const STEP_WANT = 3;
const STEP_SKIP = 4;
const STEP_CLASSICS = 5;

// ── Step indicator ────────────────────────────────────────────────────

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex gap-2 items-center justify-center">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`h-2 rounded-full transition-all duration-300 ${
            i <= current
              ? "bg-amber-600 w-6"
              : "bg-[var(--bb-warm-200)] w-2"
          }`}
        />
      ))}
    </div>
  );
}

// ── Step 1: Allergens ─────────────────────────────────────────────────

function Step1Allergens({
  selected,
  onToggle,
}: {
  selected: AllergenType[];
  onToggle: (a: AllergenType) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-2xl font-bold text-[var(--bb-warm-900)] leading-tight">
          Any food allergies?
        </h2>
        <p className="mt-1 text-sm text-[var(--bb-warm-800)]/70">
          We'll flag dishes that may contain these.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {ALLERGEN_PILLS.map((pill) => {
          const active = selected.includes(pill.value);
          return (
            <button
              key={pill.value}
              onClick={() => onToggle(pill.value)}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium transition-all border cursor-pointer ${
                active
                  ? "bg-red-50 border-red-300 text-red-700 shadow-sm ring-1 ring-red-200"
                  : "bg-white border-[var(--bb-warm-200)] text-[var(--bb-warm-800)] hover:border-amber-300 hover:bg-amber-50/40"
              }`}
            >
              <span className="text-base leading-none">{pill.emoji}</span>
              <span>{pill.label}</span>
              {active && (
                <span className="ml-auto text-red-500 font-bold text-xs">✓</span>
              )}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-[var(--bb-warm-800)]/50 text-center">
        Tap to toggle. Change anytime in Settings.
      </p>
    </div>
  );
}

// ── Step 2: Diet & Spice ──────────────────────────────────────────────

function Step2DietSpice({
  selectedDiet,
  onToggleDiet,
  spiceLevel,
  onSpiceChange,
}: {
  selectedDiet: Set<DietaryRestriction>;
  onToggleDiet: (d: DietaryRestriction | "none") => void;
  spiceLevel: SpiceLevel;
  onSpiceChange: (l: SpiceLevel) => void;
}) {
  const spiceIdx = SPICE_INDEX[spiceLevel];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-[var(--bb-warm-900)] leading-tight">
          Diet & spice
        </h2>
        <p className="mt-1 text-sm text-[var(--bb-warm-800)]/70">
          Shapes your recommendations.
        </p>
      </div>

      {/* Diet pills */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--bb-warm-800)]/50">
          Diet
        </p>
        <div className="flex flex-wrap gap-2">
          {DIET_PILLS.map((pill) => {
            const active =
              pill.value === "none"
                ? selectedDiet.size === 0
                : selectedDiet.has(pill.value as DietaryRestriction);
            return (
              <button
                key={pill.value}
                onClick={() => onToggleDiet(pill.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all border cursor-pointer ${
                  active
                    ? "bg-green-50 border-green-400 text-green-700 shadow-sm ring-1 ring-green-200"
                    : "bg-white border-[var(--bb-warm-200)] text-[var(--bb-warm-800)] hover:border-amber-300 hover:bg-amber-50/40"
                }`}
              >
                {active && pill.value !== "none" && (
                  <span className="mr-1 text-green-600">✓</span>
                )}
                {pill.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Spice slider */}
      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--bb-warm-800)]/50">
          Max spice level
        </p>

        {/* Visual track with clickable segments */}
        <div className="flex gap-2">
          {SPICE_LEVELS.map((level, i) => {
            const isActive = i <= spiceIdx;
            const isCurrent = level.value === spiceLevel;
            return (
              <button
                key={level.value}
                onClick={() => onSpiceChange(level.value)}
                className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 cursor-pointer transition-all ${
                  isCurrent
                    ? "border-amber-500 bg-amber-50 shadow-sm"
                    : isActive
                    ? "border-amber-300 bg-amber-50/50"
                    : "border-[var(--bb-warm-200)] bg-white hover:border-amber-200"
                }`}
              >
                <span className="text-sm leading-none min-h-[1.25rem] flex items-center">
                  {level.display}
                </span>
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wide ${
                    isCurrent
                      ? "text-amber-700"
                      : isActive
                      ? "text-amber-600/70"
                      : "text-[var(--bb-warm-800)]/40"
                  }`}
                >
                  {level.label}
                </span>
              </button>
            );
          })}
        </div>

        <p className="text-xs text-[var(--bb-warm-800)]/50 text-center">
          Dishes spicier than this will be flagged.
        </p>
      </div>
    </div>
  );
}

// ── Step 3: Classics ──────────────────────────────────────────────────

function Step3Classics({
  checked,
  onToggle,
  classics,
  countryMap,
}: {
  checked: Set<number>;
  onToggle: (id: number) => void;
  classics: Array<{ id: number; name: string; countryId: number }>;
  countryMap: Map<number, { name: string; code: string }>;
}) {
  return (
    <div className="flex flex-col gap-4 min-h-0">
      <div className="shrink-0">
        <h2 className="text-2xl font-bold text-[var(--bb-warm-900)] leading-tight">
          What have you already tried?
        </h2>
        <p className="mt-1 text-sm text-[var(--bb-warm-800)]/70">
          Tap classics you've had. We'll fill in your map.
        </p>
      </div>

      {/* Counter */}
      <p className="shrink-0 text-xs text-[var(--bb-warm-800)]/60 font-medium">
        <span className="text-amber-700 font-bold">{checked.size}</span> of{" "}
        {classics.length} classics · scroll for more
      </p>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-1.5 min-h-0 max-h-[320px]">
        {classics.map((dish) => {
          const country = countryMap.get(dish.countryId);
          const isChecked = checked.has(dish.id);
          return (
            <button
              key={dish.id}
              onClick={() => onToggle(dish.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left transition-all cursor-pointer border ${
                isChecked
                  ? "bg-amber-50 border-amber-300 shadow-sm"
                  : "bg-white border-dashed border-[var(--bb-warm-200)] hover:border-amber-300 hover:bg-amber-50/30"
              }`}
            >
              {/* Checkbox circle */}
              <span
                className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  isChecked
                    ? "bg-amber-500 border-amber-500"
                    : "border-[var(--bb-warm-200)]"
                }`}
              >
                {isChecked && (
                  <svg
                    viewBox="0 0 12 12"
                    className="w-3 h-3 text-white"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M2 6l3 3 5-5" />
                  </svg>
                )}
              </span>

              {/* Dish name */}
              <span
                className={`flex-1 text-sm font-medium truncate ${
                  isChecked
                    ? "text-amber-900"
                    : "text-[var(--bb-warm-800)]"
                }`}
              >
                {dish.name}
              </span>

              {/* Country */}
              {country && (
                <span className="shrink-0 flex items-center gap-1 text-xs text-[var(--bb-warm-800)]/55">
                  <span className="text-base leading-none">
                    {flagEmoji(country.code)}
                  </span>
                  <span className="hidden sm:inline truncate max-w-[80px]">
                    {country.name}
                  </span>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Feature-tour step (Log / Want / Skip explainer) ───────────────────

type TourVariant = "log" | "want" | "skip";

interface TourConfig {
  emoji: string;
  title: string;
  subtitle: string;
  titleClass: string;
  bullets: string[];
  demo: { dishName: string; subline: string };
}

const TOUR_CONFIG: Record<TourVariant, TourConfig> = {
  log: {
    emoji: "✓",
    title: "Log",
    subtitle: "A dish you've actually eaten.",
    titleClass: "text-green-600",
    bullets: [
      "Counts toward your map progress",
      "Adds to your timeline & streak",
      "Lets you rate, photograph, and add notes",
    ],
    demo: { dishName: "Pho bo", subline: "★★★★ · today" },
  },
  want: {
    emoji: "📌",
    title: "Want",
    subtitle: "A dish you'd like to try.",
    titleClass: "text-amber-600",
    bullets: [
      "Pinned to your wishlist",
      "Surfaces in Discover suggestions",
      "One tap to log when you finally eat it",
    ],
    demo: { dishName: "Banh xeo", subline: "want · street food" },
  },
  skip: {
    emoji: "✕",
    title: "Skip",
    subtitle: "Not for me — de-prioritized in recs.",
    titleClass: "text-stone-500",
    bullets: [
      "Excluded from country progress (N–K)",
      "Hidden from Discover recommendations",
      "Easy to undo from any dish row",
    ],
    demo: { dishName: "Balut", subline: "skipped" },
  },
};

function DemoRow({ variant }: { variant: TourVariant }) {
  const cfg = TOUR_CONFIG[variant];

  if (variant === "log") {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-green-50 border border-green-100 px-3 py-2.5">
        <span className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-green-500 text-white text-sm font-bold">
          ✓
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-green-900 truncate">{cfg.demo.dishName}</p>
          <p className="text-xs text-green-700">{cfg.demo.subline}</p>
        </div>
      </div>
    );
  }

  if (variant === "want") {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2.5">
        <span className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-amber-400 text-white text-sm">
          📌
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-amber-900 truncate">{cfg.demo.dishName}</p>
          <p className="text-xs text-amber-700">{cfg.demo.subline}</p>
        </div>
      </div>
    );
  }

  // skip
  return (
    <div className="flex items-center gap-3 rounded-xl bg-stone-50 border border-stone-200 border-dashed px-3 py-2.5 opacity-60">
      <span className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-stone-400 text-stone-500 text-sm">
        ✕
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-stone-600 truncate line-through">
          {cfg.demo.dishName}
        </p>
        <p className="text-xs text-stone-500">{cfg.demo.subline}</p>
      </div>
    </div>
  );
}

function StepFeatureTour({
  variant,
  stepNumber,
}: {
  variant: TourVariant;
  stepNumber: number;
}) {
  const cfg = TOUR_CONFIG[variant];
  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--bb-warm-800)]/50">
          Step {stepNumber} of {TOTAL_STEPS}
        </p>
        <h2 className={`mt-1 text-3xl font-bold leading-tight ${cfg.titleClass}`}>
          <span className="mr-2">{cfg.emoji}</span>
          {cfg.title}
        </h2>
        <p className="mt-2 text-sm text-[var(--bb-warm-800)]/70">{cfg.subtitle}</p>
      </div>

      <DemoRow variant={variant} />

      <ul className="flex flex-col gap-2">
        {cfg.bullets.map((b, i) => (
          <li
            key={i}
            className="flex items-start gap-2 text-sm text-[var(--bb-warm-800)]"
          >
            <span className={`mt-0.5 shrink-0 ${cfg.titleClass}`}>•</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Main Onboarding component ─────────────────────────────────────────

export default function Onboarding() {
  const dishes = useAppStore((s) => s.dishes);
  const countries = useAppStore((s) => s.countries);
  const updateProfile = useAppStore((s) => s.updateProfile);
  const setOnboardingComplete = useAppStore((s) => s.setOnboardingComplete);
  const setDishStatus = useAppStore((s) => s.setDishStatus);

  // Step state
  const [step, setStep] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [slideDir, setSlideDir] = useState<"left" | "right">("left");

  // Step 1 local state
  const [selectedAllergens, setSelectedAllergens] = useState<AllergenType[]>(
    []
  );

  // Step 2 local state
  const [selectedDiet, setSelectedDiet] = useState<Set<DietaryRestriction>>(
    new Set()
  );
  const [spiceLevel, setSpiceLevel] = useState<SpiceLevel>("extreme");

  // Step 3 local state
  const [checkedClassics, setCheckedClassics] = useState<Set<number>>(
    new Set()
  );

  // Compute signature dishes limited to MAX_CLASSICS
  const classics = useMemo(() => {
    return dishes
      .filter((d) => d.isSignature)
      .slice(0, MAX_CLASSICS)
      .map((d) => ({ id: d.id, name: d.name, countryId: d.countryId }));
  }, [dishes]);

  // Country lookup map
  const countryMap = useMemo(() => {
    const m = new Map<number, { name: string; code: string }>();
    for (const c of countries) {
      m.set(c.id, { name: c.name, code: c.code });
    }
    return m;
  }, [countries]);

  // ── Handlers ───────────────────────────────────────────────────────

  const toggleAllergen = (a: AllergenType) => {
    setSelectedAllergens((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
    );
  };

  const toggleDiet = (d: DietaryRestriction | "none") => {
    if (d === "none") {
      setSelectedDiet(new Set());
      return;
    }
    setSelectedDiet((prev) => {
      const next = new Set(prev);
      if (next.has(d)) {
        next.delete(d);
      } else {
        next.add(d);
      }
      return next;
    });
  };

  const toggleClassic = (id: number) => {
    setCheckedClassics((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const goToStep = (next: number, dir: "left" | "right") => {
    if (animating) return;
    setSlideDir(dir);
    setAnimating(true);
    setTimeout(() => {
      setStep(next);
      setAnimating(false);
    }, 220);
  };

  const handleNext = () => {
    if (step === 0) {
      updateProfile({ allergens: [...selectedAllergens] });
      goToStep(1, "left");
    } else if (step === 1) {
      updateProfile({
        dietaryRestrictions: [...selectedDiet],
        maxSpiceLevel: spiceLevel,
      });
      goToStep(2, "left");
    } else if (step < STEP_CLASSICS) {
      goToStep(step + 1, "left");
    }
  };

  const handleBack = () => {
    if (step > 0) goToStep(step - 1, "right");
  };

  const handleSkip = () => {
    if (step === 0) {
      goToStep(1, "left");
    } else if (step === 1) {
      // Persist current diet/spice selections so back-nav still works
      updateProfile({
        dietaryRestrictions: [...selectedDiet],
        maxSpiceLevel: spiceLevel,
      });
      goToStep(2, "left");
    }
  };

  const handleFinish = () => {
    // Apply step 2 in case user went back
    updateProfile({
      dietaryRestrictions: [...selectedDiet],
      maxSpiceLevel: spiceLevel,
    });
    // Mark all checked classics as tried
    for (const dishId of checkedClassics) {
      setDishStatus(dishId, "tried");
    }
    setOnboardingComplete(true);
  };

  // ── Render ─────────────────────────────────────────────────────────

  const slideClass = animating
    ? slideDir === "left"
      ? "opacity-0 -translate-x-4"
      : "opacity-0 translate-x-4"
    : "opacity-100 translate-x-0";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#f5f0e4] p-4">
      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-[var(--bb-warm-200)] overflow-hidden flex flex-col">

        {/* Top accent bar */}
        <div className="h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500" />

        {/* Card body */}
        <div className="flex flex-col flex-1 p-6 gap-6">

          {/* Animated step content */}
          <div
            className={`transition-all duration-200 ease-out ${slideClass}`}
            style={{ minHeight: step === STEP_CLASSICS ? "440px" : "360px" }}
          >
            {step === 0 && (
              <Step1Allergens
                selected={selectedAllergens}
                onToggle={toggleAllergen}
              />
            )}
            {step === 1 && (
              <Step2DietSpice
                selectedDiet={selectedDiet}
                onToggleDiet={toggleDiet}
                spiceLevel={spiceLevel}
                onSpiceChange={setSpiceLevel}
              />
            )}
            {step === STEP_LOG && (
              <StepFeatureTour variant="log" stepNumber={STEP_LOG + 1} />
            )}
            {step === STEP_WANT && (
              <StepFeatureTour variant="want" stepNumber={STEP_WANT + 1} />
            )}
            {step === STEP_SKIP && (
              <StepFeatureTour variant="skip" stepNumber={STEP_SKIP + 1} />
            )}
            {step === STEP_CLASSICS && (
              <Step3Classics
                checked={checkedClassics}
                onToggle={toggleClassic}
                classics={classics}
                countryMap={countryMap}
              />
            )}
          </div>

          {/* Footer */}
          <div className="flex flex-col gap-3 mt-auto shrink-0">
            {/* Step dots */}
            <StepDots current={step} total={TOTAL_STEPS} />

            {/* Action buttons */}
            {step < STEP_CLASSICS ? (
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleNext}
                  className="w-full py-3 rounded-xl bg-amber-500 text-white font-semibold text-sm hover:bg-amber-600 active:bg-amber-700 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  next
                  <span aria-hidden>→</span>
                </button>
                {step === 0 && (
                  <button
                    onClick={handleSkip}
                    className="w-full py-2 text-sm text-[var(--bb-warm-800)]/50 hover:text-[var(--bb-warm-800)]/80 transition-colors cursor-pointer"
                  >
                    skip for now
                  </button>
                )}
                {step === 1 && (
                  <div className="flex items-center justify-between gap-3">
                    <button
                      onClick={handleBack}
                      className="flex-1 py-2 text-sm text-[var(--bb-warm-800)]/50 hover:text-[var(--bb-warm-800)]/80 transition-colors cursor-pointer"
                    >
                      ← back
                    </button>
                    <button
                      onClick={handleSkip}
                      className="flex-1 py-2 text-sm text-[var(--bb-warm-800)]/50 hover:text-[var(--bb-warm-800)]/80 transition-colors cursor-pointer"
                    >
                      skip for now
                    </button>
                  </div>
                )}
                {step >= STEP_LOG && step < STEP_CLASSICS && (
                  <button
                    onClick={handleBack}
                    className="w-full py-2 text-sm text-[var(--bb-warm-800)]/50 hover:text-[var(--bb-warm-800)]/80 transition-colors cursor-pointer"
                  >
                    ← back
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleFinish}
                  className="w-full py-3 rounded-xl bg-amber-500 text-white font-bold text-sm hover:bg-amber-600 active:bg-amber-700 transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-amber-200"
                >
                  open my map!
                  <span aria-hidden>→</span>
                </button>
                <button
                  onClick={handleBack}
                  className="w-full py-2 text-sm text-[var(--bb-warm-800)]/50 hover:text-[var(--bb-warm-800)]/80 transition-colors cursor-pointer"
                >
                  ← back
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
