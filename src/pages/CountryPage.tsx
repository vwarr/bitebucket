import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAppStore } from "../stores/appStore";
import ProgressBar from "../components/ProgressBar";
import DishCard from "../components/DishCard";
import type { DishCategory, DishStatus } from "../types";

// ── Helpers ─────────────────────────────────────────────────────────

function flagEmoji(code: string): string {
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

const CATEGORIES: (DishCategory | "all")[] = [
  "all",
  "appetizer",
  "main",
  "dessert",
  "street food",
  "beverage",
  "snack",
];

const STATUS_FILTERS: { value: DishStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "untried", label: "Untried" },
  { value: "tried", label: "Tried" },
  { value: "want-to-try", label: "Want to Try" },
  { value: "skipped", label: "Skipped" },
];

// ── Component ───────────────────────────────────────────────────────

export default function CountryPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const routeCountryId = id ? Number(id) : null;

  const {
    countries,
    dishes,
    userEntries,
    getCountryProgress,
    selectCountry,
    profile: userProfile,
    isDishFiltered,
  } = useAppStore();

  // Sync route param with store
  useEffect(() => {
    if (routeCountryId !== null) selectCountry(routeCountryId);
  }, [routeCountryId, selectCountry]);

  const [catFilter, setCatFilter] = useState<DishCategory | "all">("all");
  const [statusFilter, setStatusFilter] = useState<DishStatus | "all">("all");

  const country = useMemo(
    () => countries.find((c) => c.id === routeCountryId) ?? null,
    [countries, routeCountryId],
  );

  const countryDishes = useMemo(
    () => dishes.filter((d) => d.countryId === routeCountryId),
    [dishes, routeCountryId],
  );

  const filteredDishes = useMemo(() => {
    let list = countryDishes;

    // Hide profile-filtered if user opted in
    if (userProfile.hideFiltered) {
      list = list.filter((d) => !isDishFiltered(d));
    }

    // Category filter
    if (catFilter !== "all") {
      list = list.filter((d) => d.category === catFilter);
    }

    // Status filter
    if (statusFilter !== "all") {
      list = list.filter((d) => {
        const s = userEntries.get(d.id)?.status ?? "untried";
        return s === statusFilter;
      });
    }

    return list;
  }, [countryDishes, catFilter, statusFilter, userEntries, userProfile, isDishFiltered]);

  if (!country) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center text-gray-400">
        <p className="text-4xl mb-2">&#x1F37D;&#xFE0F;</p>
        <p className="font-medium">Select a country to explore its dishes</p>
      </div>
    );
  }

  const progress = getCountryProgress(country.id);
  const pct = progress.total > 0 ? Math.round((progress.tried / progress.total) * 100) : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Back button */}
      <button
        type="button"
        onClick={() => { selectCountry(null); navigate("/countries"); }}
        className="inline-flex items-center gap-1 text-sm text-amber-600 hover:text-amber-800 font-medium mb-6 cursor-pointer transition-colors"
      >
        <span>&larr;</span> All Countries
      </button>

      {/* Country header */}
      <div className="flex items-center gap-4 mb-2">
        <span className="text-5xl">{flagEmoji(country.code)}</span>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{country.name}</h1>
          <p className="text-sm text-gray-500">{country.region}</p>
        </div>
      </div>

      {/* Progress */}
      <div className="max-w-md mt-4 mb-8">
        <ProgressBar
          current={progress.tried}
          total={progress.total}
          label={`${progress.tried} of ${progress.total} tried (${pct}%)`}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Category tabs */}
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCatFilter(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors cursor-pointer ${
                catFilter === cat
                  ? "bg-amber-500 text-white shadow-sm"
                  : "bg-amber-50 text-amber-700 hover:bg-amber-100"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as DishStatus | "all")}
          className="ml-auto px-3 py-2 rounded-xl border border-amber-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-300 cursor-pointer"
        >
          {STATUS_FILTERS.map((sf) => (
            <option key={sf.value} value={sf.value}>
              {sf.label}
            </option>
          ))}
        </select>
      </div>

      {/* Dish grid */}
      {filteredDishes.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-2">&#x1F371;</p>
          <p className="font-medium">No dishes match your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDishes.map((dish) => (
            <DishCard key={dish.id} dish={dish} />
          ))}
        </div>
      )}
    </div>
  );
}
