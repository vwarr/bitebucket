import { useMemo, useState } from "react";
import { useAppStore } from "../stores/appStore";
import DishCard from "../components/DishCard";
import type { DishCategory, Region } from "../types";

// ── Constants ───────────────────────────────────────────────────────

const CATEGORIES: DishCategory[] = [
  "appetizer",
  "main",
  "dessert",
  "street food",
  "beverage",
  "snack",
];

const CATEGORY_ICONS: Record<DishCategory, string> = {
  appetizer: "\uD83E\uDD57",
  main: "\uD83C\uDF72",
  dessert: "\uD83C\uDF70",
  "street food": "\uD83C\uDF2E",
  beverage: "\uD83C\uDF75",
  snack: "\uD83C\uDF7F",
};

const ALL_REGIONS: Region[] = [
  "East Asia",
  "Southeast Asia",
  "South Asia",
  "Central Asia",
  "Middle East",
  "North Africa",
  "West Africa",
  "East Africa",
  "Southern Africa",
  "Western Europe",
  "Eastern Europe",
  "Scandinavia",
  "North America",
  "Central America & Caribbean",
  "South America",
  "Oceania",
];

// ── Component ───────────────────────────────────────────────────────

export default function CategoryPage() {
  const { dishes, countries, profile: userProfile, isDishFiltered, regionFilter, setRegionFilter } =
    useAppStore();

  const [activeCategory, setActiveCategory] = useState<DishCategory>("main");

  // Build a country-name lookup
  const countryMap = useMemo(() => {
    const map: Record<number, { name: string; region: Region }> = {};
    for (const c of countries) {
      map[c.id] = { name: c.name, region: c.region };
    }
    return map;
  }, [countries]);

  // Filter dishes
  const filteredDishes = useMemo(() => {
    let list = dishes.filter((d) => d.category === activeCategory);

    // Region filter
    if (regionFilter) {
      list = list.filter((d) => countryMap[d.countryId]?.region === regionFilter);
    }

    // Hide filtered if opted in
    if (userProfile.hideFiltered) {
      list = list.filter((d) => !isDishFiltered(d));
    }

    // Sort by country name then dish name
    list.sort((a, b) => {
      const ca = countryMap[a.countryId]?.name ?? "";
      const cb = countryMap[b.countryId]?.name ?? "";
      return ca.localeCompare(cb) || a.name.localeCompare(b.name);
    });

    return list;
  }, [dishes, activeCategory, regionFilter, userProfile, isDishFiltered, countryMap]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <h1 className="text-3xl font-bold text-gray-900 mb-1">Browse by Category</h1>
      <p className="text-gray-500 mb-6">
        Explore dishes across all countries by type
      </p>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all cursor-pointer ${
              activeCategory === cat
                ? "bg-amber-500 text-white shadow-md shadow-amber-200"
                : "bg-white border border-amber-200 text-amber-700 hover:bg-amber-50"
            }`}
          >
            <span>{CATEGORY_ICONS[cat]}</span>
            {cat}
          </button>
        ))}
      </div>

      {/* Region filter */}
      <div className="flex flex-wrap gap-1.5 mb-6">
        <button
          type="button"
          onClick={() => setRegionFilter(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
            regionFilter === null
              ? "bg-amber-500 text-white shadow-sm"
              : "bg-amber-50 text-amber-700 hover:bg-amber-100"
          }`}
        >
          All Regions
        </button>
        {ALL_REGIONS.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRegionFilter(regionFilter === r ? null : r)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
              regionFilter === r
                ? "bg-amber-500 text-white shadow-sm"
                : "bg-amber-50 text-amber-700 hover:bg-amber-100"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Results count */}
      <p className="text-sm text-gray-500 mb-4">
        {filteredDishes.length} {filteredDishes.length === 1 ? "dish" : "dishes"} found
      </p>

      {/* Dish grid */}
      {filteredDishes.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-2">{CATEGORY_ICONS[activeCategory]}</p>
          <p className="font-medium">No {activeCategory} dishes match your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDishes.map((dish) => (
            <DishCard
              key={dish.id}
              dish={dish}
              countryName={countryMap[dish.countryId]?.name}
            />
          ))}
        </div>
      )}
    </div>
  );
}
