import { useState, useMemo } from "react";
import { useAppStore } from "../stores/appStore";
import type { AllergenType, DietaryRestriction, SpiceLevel } from "../types";

// ── Helpers ──────────────────────────────────────────────────────────

function flagEmoji(code: string): string {
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

// ── Constants ────────────────────────────────────────────────────────

const ALLERGEN_LABELS: Record<AllergenType, string> = {
  gluten: "Gluten",
  dairy: "Dairy",
  "tree-nuts": "Tree Nuts",
  peanuts: "Peanuts",
  shellfish: "Shellfish",
  fish: "Fish",
  soy: "Soy",
  eggs: "Eggs",
  sesame: "Sesame",
};

const ALLERGENS: { value: AllergenType; label: string }[] = [
  { value: "gluten", label: "Gluten" },
  { value: "dairy", label: "Dairy" },
  { value: "tree-nuts", label: "Tree Nuts" },
  { value: "peanuts", label: "Peanuts" },
  { value: "shellfish", label: "Shellfish" },
  { value: "fish", label: "Fish" },
  { value: "soy", label: "Soy" },
  { value: "eggs", label: "Eggs" },
  { value: "sesame", label: "Sesame" },
];

const DIETARY: { value: DietaryRestriction; label: string }[] = [
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "halal", label: "Halal" },
  { value: "kosher", label: "Kosher" },
  { value: "low-sodium", label: "Low Sodium" },
  { value: "nightshade-free", label: "Nightshade-Free" },
];

const SPICE_LEVELS: { value: SpiceLevel; label: string; peppers: number }[] = [
  { value: "mild", label: "Mild", peppers: 1 },
  { value: "medium", label: "Medium", peppers: 2 },
  { value: "hot", label: "Hot", peppers: 3 },
  { value: "extreme", label: "Extreme", peppers: 4 },
];

// ── Toggle Switch ────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors cursor-pointer ${
        checked ? "bg-[var(--bb-amber-500)]" : "bg-[var(--bb-warm-200)]"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

// ── Section header ───────────────────────────────────────────────────

function SectionHeader({
  emoji,
  title,
  subtitle,
}: {
  emoji: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-3">
      <h2 className="text-base font-semibold text-[var(--bb-warm-900)] flex items-center gap-2">
        <span>{emoji}</span>
        {title}
      </h2>
      {subtitle && (
        <p className="text-xs text-[var(--bb-warm-800)]/60 mt-0.5 ml-6">
          {subtitle}
        </p>
      )}
    </div>
  );
}

// ── MePage ───────────────────────────────────────────────────────────

export default function MePage() {
  const profile = useAppStore((s) => s.profile);
  const updateProfile = useAppStore((s) => s.updateProfile);
  const getWantToTryDishes = useAppStore((s) => s.getWantToTryDishes);
  const dishes = useAppStore((s) => s.dishes);
  const countries = useAppStore((s) => s.countries);
  const userEntries = useAppStore((s) => s.userEntries);
  const selectDish = useAppStore((s) => s.selectDish);
  const isDishFiltered = useAppStore((s) => s.isDishFiltered);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [customInput, setCustomInput] = useState("");

  // ── Want to try ─────────────────────────────────────────────────────
  const wantToTry = useMemo(() => getWantToTryDishes(), [userEntries, dishes, countries]);

  // ── Discover: untried dishes from regions the user hasn't explored ──
  const discoverItems = useMemo(() => {
    const triedCountryIds = new Set<number>();
    for (const entry of userEntries.values()) {
      if (entry.status === "tried") {
        const dish = dishes.find((d) => d.id === entry.dishId);
        if (dish) triedCountryIds.add(dish.countryId);
      }
    }
    // Find dishes from countries NOT yet started
    const candidates = dishes.filter((d) => {
      if (isDishFiltered(d)) return false;
      if (triedCountryIds.has(d.countryId)) return false;
      if (userEntries.get(d.id)?.status === "tried") return false;
      return true;
    });
    // Prefer signature dishes, variety of regions
    const seen = new Set<number>(); // countryIds represented
    const result: typeof candidates = [];
    // First pass: one per new country, prefer signatures
    const byCountry = new Map<number, typeof candidates[0]>();
    for (const d of candidates) {
      const existing = byCountry.get(d.countryId);
      if (!existing || (d.isSignature && !existing.isSignature)) {
        byCountry.set(d.countryId, d);
      }
    }
    for (const d of byCountry.values()) {
      if (result.length >= 12) break;
      result.push(d);
      seen.add(d.countryId);
    }
    // Fill up to 12 if needed
    if (result.length < 12) {
      for (const d of candidates) {
        if (result.length >= 12) break;
        if (!result.includes(d)) result.push(d);
      }
    }
    return result.slice(0, 12);
  }, [dishes, countries, userEntries, isDishFiltered]);

  // ── Country lookup ───────────────────────────────────────────────────
  const countryMap = useMemo(
    () => new Map(countries.map((c) => [c.id, c])),
    [countries],
  );

  // ── Settings handlers ────────────────────────────────────────────────

  const toggleAllergen = (a: AllergenType) => {
    const current = profile.allergens;
    updateProfile({
      allergens: current.includes(a)
        ? current.filter((x) => x !== a)
        : [...current, a],
    });
  };

  const toggleDietary = (d: DietaryRestriction) => {
    const current = profile.dietaryRestrictions;
    updateProfile({
      dietaryRestrictions: current.includes(d)
        ? current.filter((x) => x !== d)
        : [...current, d],
    });
  };

  const addCustomRestriction = () => {
    const trimmed = customInput.trim().toLowerCase();
    if (!trimmed || profile.customRestrictions.includes(trimmed)) return;
    updateProfile({
      customRestrictions: [...profile.customRestrictions, trimmed],
    });
    setCustomInput("");
  };

  const removeCustomRestriction = (keyword: string) => {
    updateProfile({
      customRestrictions: profile.customRestrictions.filter(
        (k) => k !== keyword,
      ),
    });
  };

  const spiceLabel = SPICE_LEVELS.find((s) => s.value === profile.maxSpiceLevel)?.label ?? profile.maxSpiceLevel;

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 space-y-6 pb-10">
      {/* ── Title ──────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--bb-warm-900)]">Me</h1>
        <p className="text-sm text-[var(--bb-warm-800)]/60 mt-0.5">
          Your food profile &amp; personalized picks
        </p>
      </div>

      {/* ── Section 1: Profile Summary ─────────────────────────────── */}
      <section className="bg-white rounded-xl border border-[var(--bb-warm-200)] p-4 shadow-sm">
        <SectionHeader emoji="🧑‍🍳" title="Your Profile" />

        {/* Allergen pills */}
        <div className="mb-3">
          <p className="text-xs font-medium text-[var(--bb-warm-800)]/50 uppercase tracking-wide mb-2">
            Allergens
          </p>
          {profile.allergens.length === 0 ? (
            <p className="text-sm text-[var(--bb-warm-800)]/40 italic">
              None set
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {profile.allergens.map((a) => (
                <span
                  key={a}
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200"
                >
                  {ALLERGEN_LABELS[a] ?? a}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Diet row */}
        <div className="mb-3">
          <p className="text-xs font-medium text-[var(--bb-warm-800)]/50 uppercase tracking-wide mb-2">
            Diet
          </p>
          {profile.dietaryRestrictions.length === 0 ? (
            <p className="text-sm text-[var(--bb-warm-800)]/40 italic">
              None set
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {profile.dietaryRestrictions.map((d) => (
                <span
                  key={d}
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200"
                >
                  {d}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Spice row */}
        <div className="mb-4">
          <p className="text-xs font-medium text-[var(--bb-warm-800)]/50 uppercase tracking-wide mb-1">
            Max Spice
          </p>
          <span className="text-sm text-[var(--bb-warm-900)] font-medium">
            {"🌶".repeat(
              SPICE_LEVELS.find((s) => s.value === profile.maxSpiceLevel)
                ?.peppers ?? 4,
            )}{" "}
            {spiceLabel}
          </span>
        </div>

        <button
          onClick={() => setSettingsOpen((o) => !o)}
          className="text-xs font-medium text-amber-700 hover:text-amber-800 transition-colors cursor-pointer"
        >
          {settingsOpen ? "Hide settings ▲" : "Edit preferences ▼"}
        </button>
      </section>

      {/* ── Section 4 (inline): Settings (collapsible) ─────────────── */}
      {settingsOpen && (
        <section className="bg-white rounded-xl border border-[var(--bb-warm-200)] p-4 shadow-sm space-y-5">
          <h2 className="text-base font-semibold text-[var(--bb-warm-900)]">
            Preferences
          </h2>

          {/* Allergens */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--bb-warm-800)]/50 mb-2">
              Allergens
            </p>
            <div className="grid grid-cols-3 gap-2">
              {ALLERGENS.map((a) => {
                const active = profile.allergens.includes(a.value);
                return (
                  <button
                    key={a.value}
                    onClick={() => toggleAllergen(a.value)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all border cursor-pointer ${
                      active
                        ? "bg-red-50 border-red-300 text-red-700 ring-1 ring-red-200"
                        : "bg-[var(--bb-warm-50)] border-[var(--bb-warm-200)] text-[var(--bb-warm-800)] hover:border-amber-300"
                    }`}
                  >
                    {active && <span className="mr-1">!</span>}
                    {a.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dietary */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--bb-warm-800)]/50 mb-2">
              Dietary Restrictions
            </p>
            <div className="grid grid-cols-3 gap-2">
              {DIETARY.map((d) => {
                const active = profile.dietaryRestrictions.includes(d.value);
                return (
                  <button
                    key={d.value}
                    onClick={() => toggleDietary(d.value)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all border cursor-pointer ${
                      active
                        ? "bg-green-50 border-green-300 text-green-700 ring-1 ring-green-200"
                        : "bg-[var(--bb-warm-50)] border-[var(--bb-warm-200)] text-[var(--bb-warm-800)] hover:border-amber-300"
                    }`}
                  >
                    {active && <span className="mr-1">&#10003;</span>}
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Spice */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--bb-warm-800)]/50 mb-2">
              Max Spice Level
            </p>
            <div className="flex gap-2">
              {SPICE_LEVELS.map((level) => {
                const selected = profile.maxSpiceLevel === level.value;
                return (
                  <button
                    key={level.value}
                    onClick={() => updateProfile({ maxSpiceLevel: level.value })}
                    className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-lg border-2 text-xs cursor-pointer transition-all ${
                      selected
                        ? "border-amber-500 bg-amber-50 text-amber-800 font-semibold"
                        : "border-[var(--bb-warm-200)] bg-white text-[var(--bb-warm-800)] hover:border-amber-300"
                    }`}
                  >
                    <span>{"🌶".repeat(level.peppers)}</span>
                    <span>{level.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom restrictions */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--bb-warm-800)]/50 mb-2">
              Custom Restrictions
            </p>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCustomRestriction()}
                placeholder="e.g. cilantro, msg..."
                className="flex-1 px-3 py-2 rounded-lg border border-[var(--bb-warm-200)] bg-[var(--bb-warm-50)] text-xs focus:outline-none focus:border-[var(--bb-amber-400)] focus:ring-2 focus:ring-[var(--bb-amber-200)]"
              />
              <button
                onClick={addCustomRestriction}
                className="px-3 py-2 rounded-lg bg-[var(--bb-amber-500)] text-white text-xs font-medium hover:bg-[var(--bb-amber-600)] transition-colors cursor-pointer"
              >
                Add
              </button>
            </div>
            {profile.customRestrictions.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {profile.customRestrictions.map((keyword) => (
                  <span
                    key={keyword}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-[var(--bb-orange-50)] border border-[var(--bb-orange-400)]/30 text-[var(--bb-orange-600)] rounded-full text-xs"
                  >
                    {keyword}
                    <button
                      onClick={() => removeCustomRestriction(keyword)}
                      className="hover:text-red-600 transition-colors font-bold cursor-pointer"
                      aria-label={`Remove ${keyword}`}
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Display toggles */}
          <div className="space-y-3 pt-1 border-t border-[var(--bb-warm-100)]">
            <label className="flex items-center justify-between gap-4 cursor-pointer">
              <div>
                <p className="text-xs font-medium text-[var(--bb-warm-900)]">
                  Hide filtered dishes
                </p>
                <p className="text-xs text-[var(--bb-warm-800)]/50">
                  When off, filtered dishes are dimmed.
                </p>
              </div>
              <Toggle
                checked={profile.hideFiltered}
                onChange={() =>
                  updateProfile({ hideFiltered: !profile.hideFiltered })
                }
              />
            </label>

            <label className="flex items-center justify-between gap-4 cursor-pointer">
              <div>
                <p className="text-xs font-medium text-[var(--bb-warm-900)]">
                  Exclude filtered from progress
                </p>
                <p className="text-xs text-[var(--bb-warm-800)]/50">
                  Count only dishes matching your profile.
                </p>
              </div>
              <Toggle
                checked={profile.excludeFilteredFromProgress}
                onChange={() =>
                  updateProfile({
                    excludeFilteredFromProgress:
                      !profile.excludeFilteredFromProgress,
                  })
                }
              />
            </label>
          </div>
        </section>
      )}

      {/* ── Section 2: Want to Try ──────────────────────────────────── */}
      <section>
        <SectionHeader
          emoji="📌"
          title="Want to Try"
          subtitle={
            wantToTry.length > 0
              ? `${wantToTry.length} dish${wantToTry.length === 1 ? "" : "es"} on your list`
              : undefined
          }
        />

        {wantToTry.length === 0 ? (
          <div className="bg-white rounded-xl border border-[var(--bb-warm-200)] p-6 text-center">
            <p className="text-sm text-[var(--bb-warm-800)]/40 italic">
              No dishes saved yet. Mark dishes as "Want to Try" to see them
              here.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {wantToTry.map(({ dish, country }) => (
              <button
                key={dish.id}
                onClick={() => selectDish(dish.id)}
                className="w-full flex items-center gap-3 bg-white rounded-xl border border-[var(--bb-warm-200)] px-4 py-3 text-left hover:border-amber-300 hover:shadow-sm transition-all cursor-pointer"
              >
                <span className="text-xl leading-none shrink-0">
                  {flagEmoji(country.code)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[var(--bb-warm-900)] truncate">
                    {dish.name}
                  </p>
                  <p className="text-xs text-[var(--bb-warm-800)]/60 truncate">
                    {country.name}
                    {dish.isSignature && (
                      <span className="ml-1.5 text-amber-600">· Signature</span>
                    )}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-[var(--bb-warm-800)]/40">
                  ›
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* ── Section 3: Discover ────────────────────────────────────── */}
      <section>
        <SectionHeader
          emoji="🧭"
          title="Discover"
          subtitle="Untried dishes from regions you haven't explored yet"
        />

        {discoverItems.length === 0 ? (
          <div className="bg-white rounded-xl border border-[var(--bb-warm-200)] p-6 text-center">
            <p className="text-sm text-[var(--bb-warm-800)]/40 italic">
              {dishes.length === 0
                ? "No dishes loaded yet."
                : "You've explored every region — amazing!"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {discoverItems.map((dish) => {
              const country = countryMap.get(dish.countryId);
              return (
                <button
                  key={dish.id}
                  onClick={() => selectDish(dish.id)}
                  className="flex items-center gap-3 bg-white rounded-xl border border-[var(--bb-warm-200)] px-4 py-3 text-left hover:border-amber-300 hover:shadow-sm transition-all cursor-pointer"
                >
                  <span className="text-xl leading-none shrink-0">
                    {country ? flagEmoji(country.code) : "🍽"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--bb-warm-900)] truncate">
                      {dish.name}
                    </p>
                    <p className="text-xs text-[var(--bb-warm-800)]/60 truncate">
                      {country?.name ?? "Unknown"}
                      {dish.isSignature && (
                        <span className="ml-1.5 text-amber-600">
                          · Signature
                        </span>
                      )}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-[var(--bb-warm-800)]/40">
                    ›
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Bottom spacer */}
      <div className="h-4" />
    </div>
  );
}
