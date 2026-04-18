import { useState, useRef } from "react";
import { useAppStore } from "../stores/appStore";
import type { AllergenType, DietaryRestriction, SpiceLevel } from "../types";

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

function PepperIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`w-5 h-5 inline-block ${filled ? "text-red-500" : "text-[var(--bb-warm-200)]"}`}
      fill="currentColor"
    >
      <path d="M12 2C11 2 10 3 10 4c-3 0-6 3-6 7 0 5 3 9 7 11 .3.1.7.1 1 0 4-2 7-6 7-11 0-4-3-7-6-7 0-1-1-2-2-2zm0 3c.5 0 1 .3 1.4.7.3.3.6.3.9.1C16 5 17.5 6.5 18 8.5c-1-.3-2-.5-3-.5-1.5 0-2.8.5-3.8 1.3-.3.2-.7.2-.9-.1C9 8 8.5 6.5 8.5 5.5c0-.3.1-.5.2-.7.5-.5 1.5-.8 3.3-.8z" />
    </svg>
  );
}

export default function SettingsPage() {
  const { profile: userProfile, updateProfile, userEntries, dishes } = useAppStore();
  const [customInput, setCustomInput] = useState("");
  const [importText, setImportText] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const toggleAllergen = (a: AllergenType) => {
    const current = userProfile.allergens;
    updateProfile({
      allergens: current.includes(a)
        ? current.filter((x) => x !== a)
        : [...current, a],
    });
  };

  const toggleDietary = (d: DietaryRestriction) => {
    const current = userProfile.dietaryRestrictions;
    updateProfile({
      dietaryRestrictions: current.includes(d)
        ? current.filter((x) => x !== d)
        : [...current, d],
    });
  };

  const addCustomRestriction = () => {
    const trimmed = customInput.trim().toLowerCase();
    if (!trimmed || userProfile.customRestrictions.includes(trimmed)) return;
    updateProfile({
      customRestrictions: [...userProfile.customRestrictions, trimmed],
    });
    setCustomInput("");
  };

  const removeCustomRestriction = (keyword: string) => {
    updateProfile({
      customRestrictions: userProfile.customRestrictions.filter(
        (k) => k !== keyword,
      ),
    });
  };

  const handleExport = () => {
    const data = JSON.stringify(
      { userEntries, userProfile },
      null,
      2,
    );
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bitebucket-data.json";
    a.click();
    URL.revokeObjectURL(url);
    showToast("Data exported successfully!");
  };

  const handleCopyToClipboard = () => {
    const data = JSON.stringify(
      { userEntries, userProfile },
      null,
      2,
    );
    navigator.clipboard.writeText(data);
    showToast("Copied to clipboard!");
  };

  const handleImport = () => {
    try {
      const parsed = JSON.parse(importText);
      if (parsed.userProfile) {
        updateProfile(parsed.userProfile);
      }
      if (parsed.userEntries) {
        const store = useAppStore.getState();
        for (const [, entry] of Object.entries(parsed.userEntries)) {
          const e = entry as { dishId: number; status: string };
          if (e.dishId && e.status) {
            store.setDishStatus(
              e.dishId,
              e.status as "untried" | "tried" | "want-to-try" | "skipped",
            );
          }
        }
      }
      setShowImport(false);
      setImportText("");
      showToast("Data imported successfully!");
    } catch {
      showToast("Invalid JSON data. Please check and try again.");
    }
  };

  const handleReset = () => {
    updateProfile({
      allergens: [],
      dietaryRestrictions: [],
      customRestrictions: [],
      maxSpiceLevel: "extreme",
      hideFiltered: false,
      excludeFilteredFromProgress: false,
    });
    // Reset all dish entries
    const store = useAppStore.getState();
    for (const dish of dishes) {
      if (store.userEntries.get(dish.id)) {
        store.setDishStatus(dish.id, "untried");
      }
    }
    setShowResetConfirm(false);
    showToast("All progress and settings have been reset.");
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-[var(--bb-warm-900)] text-white px-5 py-3 rounded-lg shadow-lg text-sm animate-fade-in">
          {toast}
        </div>
      )}

      <h1 className="text-3xl font-bold text-[var(--bb-warm-900)]">Settings</h1>

      {/* ── Allergy Profile ──────────────────────────────────────── */}
      <section className="bg-white rounded-xl shadow-sm border border-[var(--bb-warm-200)] p-6">
        <h2 className="text-xl font-semibold text-[var(--bb-warm-900)] mb-1">
          Allergy Profile
        </h2>
        <p className="text-sm text-[var(--bb-warm-800)]/60 mb-4">
          Select allergens to flag dishes that may contain them.
        </p>
        <div className="grid grid-cols-3 gap-3">
          {ALLERGENS.map((a) => {
            const active = userProfile.allergens.includes(a.value);
            return (
              <button
                key={a.value}
                onClick={() => toggleAllergen(a.value)}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all border cursor-pointer ${
                  active
                    ? "bg-red-50 border-red-300 text-red-700 shadow-sm ring-1 ring-red-200"
                    : "bg-[var(--bb-warm-50)] border-[var(--bb-warm-200)] text-[var(--bb-warm-800)] hover:border-[var(--bb-amber-300)]"
                }`}
              >
                {active && <span className="mr-1.5">!</span>}
                {a.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Dietary Restrictions ─────────────────────────────────── */}
      <section className="bg-white rounded-xl shadow-sm border border-[var(--bb-warm-200)] p-6">
        <h2 className="text-xl font-semibold text-[var(--bb-warm-900)] mb-1">
          Dietary Restrictions
        </h2>
        <p className="text-sm text-[var(--bb-warm-800)]/60 mb-4">
          Filter dishes based on dietary needs.
        </p>
        <div className="grid grid-cols-3 gap-3">
          {DIETARY.map((d) => {
            const active = userProfile.dietaryRestrictions.includes(d.value);
            return (
              <button
                key={d.value}
                onClick={() => toggleDietary(d.value)}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all border cursor-pointer ${
                  active
                    ? "bg-green-50 border-green-300 text-green-700 shadow-sm ring-1 ring-green-200"
                    : "bg-[var(--bb-warm-50)] border-[var(--bb-warm-200)] text-[var(--bb-warm-800)] hover:border-[var(--bb-amber-300)]"
                }`}
              >
                {active && <span className="mr-1.5">&#10003;</span>}
                {d.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Custom Restrictions ──────────────────────────────────── */}
      <section className="bg-white rounded-xl shadow-sm border border-[var(--bb-warm-200)] p-6">
        <h2 className="text-xl font-semibold text-[var(--bb-warm-900)] mb-1">
          Custom Restrictions
        </h2>
        <p className="text-sm text-[var(--bb-warm-800)]/60 mb-4">
          Add ingredient keywords to filter out dishes containing those
          ingredients. Matching is case-insensitive against each dish's
          ingredient list.
        </p>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCustomRestriction()}
            placeholder="e.g. cilantro, msg, coconut..."
            className="flex-1 px-4 py-2 rounded-lg border border-[var(--bb-warm-200)] bg-[var(--bb-warm-50)] text-sm focus:outline-none focus:border-[var(--bb-amber-400)] focus:ring-2 focus:ring-[var(--bb-amber-200)]"
          />
          <button
            onClick={addCustomRestriction}
            className="px-5 py-2 rounded-lg bg-[var(--bb-amber-500)] text-white text-sm font-medium hover:bg-[var(--bb-amber-600)] transition-colors cursor-pointer"
          >
            Add
          </button>
        </div>
        {userProfile.customRestrictions.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {userProfile.customRestrictions.map((keyword) => (
              <span
                key={keyword}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bb-orange-50)] border border-[var(--bb-orange-400)]/30 text-[var(--bb-orange-600)] rounded-full text-sm"
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
        ) : (
          <p className="text-sm text-[var(--bb-warm-800)]/40 italic">
            No custom restrictions added yet.
          </p>
        )}
      </section>

      {/* ── Spice Tolerance ──────────────────────────────────────── */}
      <section className="bg-white rounded-xl shadow-sm border border-[var(--bb-warm-200)] p-6">
        <h2 className="text-xl font-semibold text-[var(--bb-warm-900)] mb-1">
          Spice Tolerance
        </h2>
        <p className="text-sm text-[var(--bb-warm-800)]/60 mb-4">
          Set the maximum spice level you're comfortable with. Dishes above this
          level will be filtered.
        </p>
        <div className="flex flex-col gap-3">
          {SPICE_LEVELS.map((level) => {
            const selected = userProfile.maxSpiceLevel === level.value;
            return (
              <label
                key={level.value}
                className={`flex items-center gap-4 px-4 py-3 rounded-lg border cursor-pointer transition-all ${
                  selected
                    ? "bg-[var(--bb-amber-50)] border-[var(--bb-amber-400)] shadow-sm"
                    : "bg-[var(--bb-warm-50)] border-[var(--bb-warm-200)] hover:border-[var(--bb-amber-300)]"
                }`}
              >
                <input
                  type="radio"
                  name="spiceLevel"
                  value={level.value}
                  checked={selected}
                  onChange={() =>
                    updateProfile({ maxSpiceLevel: level.value })
                  }
                  className="accent-[var(--bb-amber-500)] w-4 h-4"
                />
                <span className="font-medium text-sm text-[var(--bb-warm-900)] min-w-[70px]">
                  {level.label}
                </span>
                <span className="flex gap-0.5">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <PepperIcon key={i} filled={i < level.peppers} />
                  ))}
                </span>
              </label>
            );
          })}
        </div>
      </section>

      {/* ── Display Preferences ──────────────────────────────────── */}
      <section className="bg-white rounded-xl shadow-sm border border-[var(--bb-warm-200)] p-6">
        <h2 className="text-xl font-semibold text-[var(--bb-warm-900)] mb-4">
          Display Preferences
        </h2>
        <div className="space-y-4">
          <label className="flex items-center justify-between gap-4 cursor-pointer">
            <div>
              <p className="text-sm font-medium text-[var(--bb-warm-900)]">
                Hide filtered dishes entirely
              </p>
              <p className="text-xs text-[var(--bb-warm-800)]/60">
                When off, filtered dishes are shown but dimmed.
              </p>
            </div>
            <button
              role="switch"
              aria-checked={userProfile.hideFiltered}
              onClick={() =>
                updateProfile({ hideFiltered: !userProfile.hideFiltered })
              }
              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors cursor-pointer ${
                userProfile.hideFiltered
                  ? "bg-[var(--bb-amber-500)]"
                  : "bg-[var(--bb-warm-200)]"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  userProfile.hideFiltered ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </label>

          <label className="flex items-center justify-between gap-4 cursor-pointer">
            <div>
              <p className="text-sm font-medium text-[var(--bb-warm-900)]">
                Exclude filtered dishes from progress
              </p>
              <p className="text-xs text-[var(--bb-warm-800)]/60">
                Progress percentages only count dishes that match your profile.
              </p>
            </div>
            <button
              role="switch"
              aria-checked={userProfile.excludeFilteredFromProgress}
              onClick={() =>
                updateProfile({
                  excludeFilteredFromProgress:
                    !userProfile.excludeFilteredFromProgress,
                })
              }
              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors cursor-pointer ${
                userProfile.excludeFilteredFromProgress
                  ? "bg-[var(--bb-amber-500)]"
                  : "bg-[var(--bb-warm-200)]"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  userProfile.excludeFilteredFromProgress
                    ? "translate-x-5"
                    : "translate-x-0"
                }`}
              />
            </button>
          </label>
        </div>
      </section>

      {/* ── Data Management ──────────────────────────────────────── */}
      <section className="bg-white rounded-xl shadow-sm border border-[var(--bb-warm-200)] p-6">
        <h2 className="text-xl font-semibold text-[var(--bb-warm-900)] mb-4">
          Data Management
        </h2>
        <div className="flex flex-wrap gap-3 mb-4">
          <button
            onClick={handleExport}
            className="px-5 py-2.5 rounded-lg bg-[var(--bb-amber-500)] text-white text-sm font-medium hover:bg-[var(--bb-amber-600)] transition-colors cursor-pointer"
          >
            Export Data (Download)
          </button>
          <button
            onClick={handleCopyToClipboard}
            className="px-5 py-2.5 rounded-lg bg-[var(--bb-warm-100)] border border-[var(--bb-warm-200)] text-[var(--bb-warm-800)] text-sm font-medium hover:bg-[var(--bb-warm-200)] transition-colors cursor-pointer"
          >
            Copy to Clipboard
          </button>
          <button
            onClick={() => setShowImport(!showImport)}
            className="px-5 py-2.5 rounded-lg bg-[var(--bb-warm-100)] border border-[var(--bb-warm-200)] text-[var(--bb-warm-800)] text-sm font-medium hover:bg-[var(--bb-warm-200)] transition-colors cursor-pointer"
          >
            Import Data
          </button>
          <button
            onClick={() => setShowResetConfirm(true)}
            className="px-5 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm font-medium hover:bg-red-100 transition-colors cursor-pointer"
          >
            Reset All Progress
          </button>
        </div>

        {showImport && (
          <div className="border border-[var(--bb-warm-200)] rounded-lg p-4 space-y-3 bg-[var(--bb-warm-50)]">
            <p className="text-sm text-[var(--bb-warm-800)]">
              Paste your exported JSON data below:
            </p>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 rounded-lg border border-[var(--bb-warm-200)] bg-white text-sm font-mono focus:outline-none focus:border-[var(--bb-amber-400)] focus:ring-2 focus:ring-[var(--bb-amber-200)]"
              placeholder='{"userEntries": {...}, "userProfile": {...}}'
            />
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                  setImportText(ev.target?.result as string);
                };
                reader.readAsText(file);
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={handleImport}
                className="px-4 py-2 rounded-lg bg-[var(--bb-amber-500)] text-white text-sm font-medium hover:bg-[var(--bb-amber-600)] transition-colors cursor-pointer"
              >
                Import
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-lg bg-[var(--bb-warm-100)] border border-[var(--bb-warm-200)] text-[var(--bb-warm-800)] text-sm font-medium hover:bg-[var(--bb-warm-200)] transition-colors cursor-pointer"
              >
                Load from File
              </button>
              <button
                onClick={() => {
                  setShowImport(false);
                  setImportText("");
                }}
                className="px-4 py-2 rounded-lg text-sm text-[var(--bb-warm-800)]/60 hover:text-[var(--bb-warm-800)] transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Reset Confirmation Dialog */}
        {showResetConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm mx-4 space-y-4">
              <h3 className="text-lg font-semibold text-[var(--bb-warm-900)]">
                Reset All Progress?
              </h3>
              <p className="text-sm text-[var(--bb-warm-800)]">
                This will clear all your dish entries, ratings, notes, and
                profile settings. This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="px-4 py-2 rounded-lg text-sm text-[var(--bb-warm-800)] hover:bg-[var(--bb-warm-100)] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors cursor-pointer"
                >
                  Yes, Reset Everything
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── Legal Disclaimer ─────────────────────────────────────── */}
      <section className="bg-[var(--bb-warm-100)] rounded-xl border border-[var(--bb-warm-200)] p-5">
        <p className="text-xs text-[var(--bb-warm-800)]/60 leading-relaxed">
          <strong>Disclaimer:</strong> Allergen and dietary information provided
          in BiteBucket is for informational purposes only and should not be
          considered medical advice. Actual ingredients may vary by recipe,
          restaurant, or region. Always verify allergen information directly with
          food preparers if you have serious allergies or dietary restrictions.
          BiteBucket is not responsible for any adverse reactions resulting from
          reliance on the data provided.
        </p>
      </section>

      {/* bottom spacer */}
      <div className="h-8" />
    </div>
  );
}
