import { useState, useMemo, useCallback } from "react";
import { useAppStore } from "../stores/appStore";
import type { Dish, Country } from "../types";

// ── Helpers ─────────────────────────────────────────────────────────

const SPICE_LABEL: Record<string, string> = {
  mild: "Mild",
  medium: "Medium",
  hot: "Hot",
  extreme: "Extreme",
};

const CATEGORY_LABEL: Record<string, string> = {
  appetizer: "Appetizer",
  main: "Main Course",
  dessert: "Dessert",
  "street food": "Street Food",
  beverage: "Beverage",
  snack: "Snack",
};

// Keyword groups for "similar dishes across countries"
const DISH_GROUPS = [
  { label: "Dumplings Around the World", keywords: ["dumpling", "gyoza", "momo", "pierogi", "empanada", "samosa", "wonton", "ravioli", "mandu", "pelmeni"] },
  { label: "Rice-Based Dishes", keywords: ["rice", "risotto", "biryani", "paella", "pilaf", "fried rice", "nasi", "jollof", "congee", "arroz"] },
  { label: "Grilled Meats", keywords: ["grill", "kebab", "satay", "yakitori", "churrasco", "tandoori", "braai", "asado", "barbecue", "bbq"] },
  { label: "Noodle Dishes", keywords: ["noodle", "pasta", "ramen", "pho", "pad thai", "soba", "udon", "laksa", "chow mein", "spaghetti"] },
  { label: "Flatbreads & Wraps", keywords: ["bread", "naan", "pita", "tortilla", "roti", "flatbread", "lavash", "injera", "chapati", "paratha"] },
  { label: "Sweet Treats", keywords: ["cake", "pastry", "sweet", "pudding", "dessert", "cookie", "tart", "flan", "baklava", "mochi"] },
  { label: "Soups & Stews", keywords: ["soup", "stew", "curry", "broth", "chowder", "goulash", "tagine", "pho", "tom yum", "pozole"] },
];

function DishCard({
  dish,
  country,
  onTryDish,
  tried,
}: {
  dish: Dish;
  country: Country | undefined;
  onTryDish?: (dishId: number) => void;
  tried: boolean;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-[var(--bb-warm-200)] p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-[var(--bb-warm-900)] truncate">
            {dish.name}
          </h4>
          {dish.nameOriginal && dish.nameOriginal !== dish.name && (
            <p className="text-xs text-[var(--bb-warm-800)]/40 truncate">
              {dish.nameOriginal}
            </p>
          )}
        </div>
        {dish.isSignature && (
          <span className="shrink-0 text-xs bg-[var(--bb-amber-100)] text-[var(--bb-amber-700)] px-2 py-0.5 rounded-full font-medium">
            Signature
          </span>
        )}
      </div>

      <p className="text-xs text-[var(--bb-warm-800)]/60 line-clamp-2 mb-3">
        {dish.description}
      </p>

      <div className="flex flex-wrap gap-1.5 mb-3">
        <span className="text-xs bg-[var(--bb-warm-100)] text-[var(--bb-warm-800)] px-2 py-0.5 rounded-full">
          {country?.name ?? "Unknown"}
        </span>
        <span className="text-xs bg-[var(--bb-warm-100)] text-[var(--bb-warm-800)] px-2 py-0.5 rounded-full">
          {CATEGORY_LABEL[dish.category] ?? dish.category}
        </span>
        <span className="text-xs bg-[var(--bb-warm-100)] text-[var(--bb-warm-800)] px-2 py-0.5 rounded-full">
          {SPICE_LABEL[dish.spiceLevel] ?? dish.spiceLevel}
          {dish.spiceLevel === "hot" && " 🌶"}
          {dish.spiceLevel === "extreme" && " 🌶🌶"}
        </span>
      </div>

      {onTryDish && !tried && (
        <button
          onClick={() => onTryDish(dish.id)}
          className="w-full py-2 rounded-lg text-xs font-medium bg-[var(--bb-amber-500)] text-white hover:bg-[var(--bb-amber-600)] transition-colors cursor-pointer"
        >
          Mark as Tried
        </button>
      )}
      {tried && (
        <div className="w-full py-2 rounded-lg text-xs font-medium bg-[var(--bb-green-500)]/10 text-[var(--bb-green-600)] text-center">
          Already Tried
        </div>
      )}
    </div>
  );
}

export default function DiscoverPage() {
  const { countries, dishes, userEntries, profile: userProfile, isDishFiltered, setDishStatus } =
    useAppStore();
  const [randomCountry, setRandomCountry] = useState<Country | null>(null);

  const countryMap = useMemo(
    () => new Map(countries.map((c) => [c.id, c])),
    [countries],
  );

  // ── Recommendations: dishes you haven't tried, from started countries ──

  const recommendations = useMemo(() => {
    const triedDishIds = new Set(
      Array.from(userEntries.values())
        .filter((e) => e.status === "tried")
        .map((e) => e.dishId),
    );

    // Countries the user has started
    const startedCountryIds = new Set<number>();
    for (const entry of userEntries.values()) {
      if (entry.status === "tried") {
        const dish = dishes.find((d) => d.id === entry.dishId);
        if (dish) startedCountryIds.add(dish.countryId);
      }
    }

    // Candidate dishes: untried, not filtered, from started countries (or all if none started)
    let candidates = dishes.filter(
      (d) =>
        !triedDishIds.has(d.id) &&
        !isDishFiltered(d) &&
        (startedCountryIds.size === 0 || startedCountryIds.has(d.countryId)),
    );

    // If we have too few from started countries, add from all countries
    if (candidates.length < 8) {
      const extra = dishes.filter(
        (d) =>
          !triedDishIds.has(d.id) &&
          !isDishFiltered(d) &&
          !startedCountryIds.has(d.countryId),
      );
      candidates = [...candidates, ...extra];
    }

    // Score: signature dishes get a boost, variety of categories preferred
    const scored = candidates.map((d) => ({
      dish: d,
      score:
        (d.isSignature ? 10 : 0) +
        (d.category === "main" ? 3 : 0) +
        (d.category === "street food" ? 2 : 0) +
        Math.random() * 5, // randomness for variety
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 8).map((s) => s.dish);
  }, [dishes, userEntries, userProfile]);

  // ── Similar dishes across countries ───────────────────────────────

  const similarGroups = useMemo(() => {
    const groups: { label: string; dishes: Dish[] }[] = [];

    for (const group of DISH_GROUPS) {
      const matching = dishes.filter((d) => {
        const nameLower = d.name.toLowerCase();
        const descLower = d.description.toLowerCase();
        const ingredients = d.keyIngredients.map((i) => i.toLowerCase());
        return group.keywords.some(
          (kw) =>
            nameLower.includes(kw) ||
            descLower.includes(kw) ||
            ingredients.some((ing) => ing.includes(kw)),
        );
      });

      // Only show groups with dishes from multiple countries
      const countryIds = new Set(matching.map((d) => d.countryId));
      if (matching.length >= 2 && countryIds.size >= 2) {
        groups.push({ label: group.label, dishes: matching.slice(0, 12) });
      }
    }

    return groups;
  }, [dishes]);

  // ── Random country ────────────────────────────────────────────────

  const pickRandomCountry = useCallback(() => {
    // Countries with dishes that aren't fully completed
    const incomplete = countries.filter((c) => {
      const countryDishes = dishes.filter((d) => d.countryId === c.id);
      if (countryDishes.length === 0) return false;
      const allTried = countryDishes.every(
        (d) => userEntries.get(d.id)?.status === "tried",
      );
      return !allTried;
    });

    if (incomplete.length === 0) {
      // All completed, pick any with dishes
      const withDishes = countries.filter((c) =>
        dishes.some((d) => d.countryId === c.id),
      );
      if (withDishes.length === 0) return;
      setRandomCountry(withDishes[Math.floor(Math.random() * withDishes.length)]);
    } else {
      setRandomCountry(
        incomplete[Math.floor(Math.random() * incomplete.length)],
      );
    }
  }, [countries, dishes, userEntries]);

  const randomCountryDishes = useMemo(() => {
    if (!randomCountry) return [];
    return dishes.filter((d) => d.countryId === randomCountry.id);
  }, [randomCountry, dishes]);

  const handleTryDish = (dishId: number) => {
    setDishStatus(dishId, "tried");
  };

  const isTried = (dishId: number) =>
    userEntries.get(dishId)?.status === "tried";

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-10">
      <h1 className="text-3xl font-bold text-[var(--bb-warm-900)]">Discover</h1>

      {/* ── Recommendations ──────────────────────────────────────── */}
      <section>
        <div className="flex items-baseline gap-3 mb-4">
          <h2 className="text-xl font-semibold text-[var(--bb-warm-900)]">
            What Should I Try Next?
          </h2>
          <span className="text-sm text-[var(--bb-warm-800)]/40">
            Personalized picks based on your profile
          </span>
        </div>

        {recommendations.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-[var(--bb-warm-200)] p-12 text-center">
            <p className="text-lg text-[var(--bb-warm-800)]/60">
              {dishes.length === 0
                ? "No dishes in the database yet."
                : "You've tried everything available! Impressive!"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recommendations.map((dish) => (
              <DishCard
                key={dish.id}
                dish={dish}
                country={countryMap.get(dish.countryId)}
                onTryDish={handleTryDish}
                tried={isTried(dish.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Similar Dishes Across Countries ──────────────────────── */}
      <section>
        <h2 className="text-xl font-semibold text-[var(--bb-warm-900)] mb-4">
          Similar Dishes Across Countries
        </h2>

        {similarGroups.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-[var(--bb-warm-200)] p-8 text-center">
            <p className="text-sm text-[var(--bb-warm-800)]/60">
              Not enough dish data to identify cross-country patterns yet.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {similarGroups.map((group) => (
              <div key={group.label}>
                <h3 className="text-sm font-semibold text-[var(--bb-amber-600)] uppercase tracking-wide mb-3">
                  {group.label}
                </h3>
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {group.dishes.map((dish) => (
                    <div key={dish.id} className="min-w-[220px] max-w-[220px] shrink-0">
                      <DishCard
                        dish={dish}
                        country={countryMap.get(dish.countryId)}
                        onTryDish={handleTryDish}
                        tried={isTried(dish.id)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Random Country ───────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-4 mb-4">
          <h2 className="text-xl font-semibold text-[var(--bb-warm-900)]">
            Random Country
          </h2>
          <button
            onClick={pickRandomCountry}
            className="px-5 py-2 rounded-lg bg-[var(--bb-amber-500)] text-white text-sm font-medium hover:bg-[var(--bb-amber-600)] transition-colors cursor-pointer shadow-sm"
          >
            {randomCountry ? "Pick Another" : "Surprise Me!"}
          </button>
        </div>

        {randomCountry ? (
          <div className="bg-white rounded-xl shadow-sm border border-[var(--bb-warm-200)] p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">
                {getFlagEmoji(randomCountry.code)}
              </span>
              <div>
                <h3 className="text-lg font-semibold text-[var(--bb-warm-900)]">
                  {randomCountry.name}
                </h3>
                <p className="text-xs text-[var(--bb-warm-800)]/60">
                  {randomCountry.region} &middot;{" "}
                  {randomCountryDishes.length} dish
                  {randomCountryDishes.length !== 1 ? "es" : ""}
                </p>
              </div>
            </div>

            {randomCountryDishes.length === 0 ? (
              <p className="text-sm text-[var(--bb-warm-800)]/60 italic">
                No dishes listed for this country yet.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {randomCountryDishes.map((dish) => (
                  <DishCard
                    key={dish.id}
                    dish={dish}
                    country={randomCountry}
                    onTryDish={handleTryDish}
                    tried={isTried(dish.id)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-[var(--bb-warm-200)] p-12 text-center">
            <p className="text-[var(--bb-warm-800)]/40 text-sm">
              Click the button above to discover a random country's cuisine!
            </p>
          </div>
        )}
      </section>

      <div className="h-8" />
    </div>
  );
}

/** Convert ISO 3166-1 alpha-2 code to flag emoji */
function getFlagEmoji(countryCode: string): string {
  const code = countryCode.toUpperCase();
  if (code.length !== 2) return "";
  const offset = 127397;
  return String.fromCodePoint(
    code.charCodeAt(0) + offset,
    code.charCodeAt(1) + offset,
  );
}
