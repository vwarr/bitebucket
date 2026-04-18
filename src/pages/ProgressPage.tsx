import { useState, useMemo } from "react";
import { useAppStore } from "../stores/appStore";
import type { Region, Continent } from "../types";

const REGION_TO_CONTINENT: Record<Region, Continent> = {
  "East Asia": "Asia",
  "Southeast Asia": "Asia",
  "South Asia": "Asia",
  "Central Asia": "Asia",
  "Middle East": "Asia",
  "North Africa": "Africa",
  "West Africa": "Africa",
  "East Africa": "Africa",
  "Southern Africa": "Africa",
  "Western Europe": "Europe",
  "Eastern Europe": "Europe",
  "Scandinavia": "Europe",
  "North America": "North America",
  "Central America & Caribbean": "North America",
  "South America": "South America",
  "Oceania": "Oceania",
};

const ACHIEVEMENT_MILESTONES = [
  { id: "first-bite", label: "First Bite", description: "Try your first dish", threshold: 1 },
  { id: "explorer", label: "Explorer", description: "Try 10 dishes", threshold: 10 },
  { id: "globetrotter", label: "Globetrotter", description: "Try 50 dishes", threshold: 50 },
  { id: "world-foodie", label: "World Foodie", description: "Try 100 dishes", threshold: 100 },
];

function CircularProgress({
  percentage,
  size = 140,
  strokeWidth = 10,
}: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--bb-warm-200)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--bb-amber-500)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-[var(--bb-warm-900)]">
          {Math.round(percentage)}%
        </span>
        <span className="text-xs text-[var(--bb-warm-800)]/60">complete</span>
      </div>
    </div>
  );
}

function MiniProgressBar({ percentage }: { percentage: number }) {
  return (
    <div className="flex-1 h-2 bg-[var(--bb-warm-200)] rounded-full overflow-hidden">
      <div
        className="h-full bg-[var(--bb-amber-500)] rounded-full transition-all duration-500"
        style={{ width: `${Math.min(100, percentage)}%` }}
      />
    </div>
  );
}

export default function ProgressPage() {
  const { countries, dishes, userEntries, profile: userProfile, isDishFiltered } = useAppStore();
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"overview" | "timeline" | "achievements">("overview");

  const excludeFiltered = userProfile.excludeFilteredFromProgress;

  // ── Computed data ─────────────────────────────────────────────────

  const stats = useMemo(() => {
    const applicableDishes = excludeFiltered
      ? dishes.filter((d) => !isDishFiltered(d))
      : dishes;

    const triedDishes = applicableDishes.filter(
      (d) => userEntries.get(d.id)?.status === "tried",
    );

    const countriesWithDishes = new Set(applicableDishes.map((d) => d.countryId));
    const countriesStarted = new Set(
      triedDishes.map((d) => d.countryId),
    );

    const countriesCompleted = new Set<number>();
    for (const cId of countriesWithDishes) {
      const countryDishes = applicableDishes.filter((d) => d.countryId === cId);
      const countryTried = countryDishes.filter(
        (d) => userEntries.get(d.id)?.status === "tried",
      );
      if (countryDishes.length > 0 && countryTried.length === countryDishes.length) {
        countriesCompleted.add(cId);
      }
    }

    const totalAvailable = applicableDishes.length;
    const totalTried = triedDishes.length;
    const percentage = totalAvailable > 0 ? (totalTried / totalAvailable) * 100 : 0;

    return {
      totalTried,
      totalAvailable,
      countriesStarted: countriesStarted.size,
      countriesCompleted: countriesCompleted.size,
      totalCountries: countriesWithDishes.size,
      percentage,
    };
  }, [dishes, userEntries, userProfile, excludeFiltered]);

  // ── Region breakdown ──────────────────────────────────────────────

  const regionBreakdown = useMemo(() => {
    const regions = new Map<
      string,
      { countries: { id: number; name: string; tried: number; total: number }[] }
    >();

    for (const country of countries) {
      const region = country.region;
      if (!regions.has(region)) {
        regions.set(region, { countries: [] });
      }

      const countryDishes = excludeFiltered
        ? dishes.filter(
            (d) => d.countryId === country.id && !isDishFiltered(d),
          )
        : dishes.filter((d) => d.countryId === country.id);

      const tried = countryDishes.filter(
        (d) => userEntries.get(d.id)?.status === "tried",
      ).length;

      if (countryDishes.length > 0) {
        regions.get(region)!.countries.push({
          id: country.id,
          name: country.name,
          tried,
          total: countryDishes.length,
        });
      }
    }

    return regions;
  }, [countries, dishes, userEntries, userProfile, excludeFiltered]);

  // ── Timeline ──────────────────────────────────────────────────────

  const timeline = useMemo(() => {
    const entries = Array.from(userEntries.values())
      .filter((e) => e.status === "tried" && e.triedDate)
      .sort((a, b) => {
        const da = a.triedDate ?? "";
        const db = b.triedDate ?? "";
        return db.localeCompare(da);
      })
      .map((entry) => {
        const dish = dishes.find((d) => d.id === entry.dishId);
        const country = dish
          ? countries.find((c) => c.id === dish.countryId)
          : null;
        return {
          ...entry,
          dishName: dish?.name ?? "Unknown Dish",
          countryName: country?.name ?? "Unknown",
          countryFlag: country?.code ?? "",
        };
      });

    // Group by month
    const grouped = new Map<string, typeof entries>();
    for (const entry of entries) {
      const date = entry.triedDate ? new Date(entry.triedDate) : new Date();
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!grouped.has(monthKey)) {
        grouped.set(monthKey, []);
      }
      grouped.get(monthKey)!.push(entry);
    }

    return { entries, grouped };
  }, [userEntries, dishes, countries]);

  // ── Achievements ──────────────────────────────────────────────────

  const achievements = useMemo(() => {
    const totalTried = Array.from(userEntries.values()).filter(
      (e) => e.status === "tried",
    ).length;

    const milestones = ACHIEVEMENT_MILESTONES.map((m) => ({
      ...m,
      unlocked: totalTried >= m.threshold,
    }));

    // Signature collector
    const signatureTried = dishes.filter(
      (d) => d.isSignature && userEntries.get(d.id)?.status === "tried",
    ).length;

    const signatureCollector = {
      id: "signature-collector",
      label: "Signature Collector",
      description: "Try 10 signature dishes",
      unlocked: signatureTried >= 10,
      progress: `${signatureTried}/10`,
    };

    // Per-continent completion
    const continentBadges: { id: string; label: string; description: string; unlocked: boolean }[] = [];
    const continents = new Set(countries.map((c) => REGION_TO_CONTINENT[c.region]));
    for (const continent of continents) {
      const continentCountries = countries.filter(
        (c) => REGION_TO_CONTINENT[c.region] === continent,
      );
      const allComplete = continentCountries.every((country) => {
        const countryDishes = dishes.filter((d) => d.countryId === country.id);
        if (countryDishes.length === 0) return true;
        return countryDishes.every(
          (d) => userEntries.get(d.id)?.status === "tried",
        );
      });
      continentBadges.push({
        id: `continent-${continent}`,
        label: `${continent} Master`,
        description: `Complete all dishes from ${continent}`,
        unlocked: allComplete && continentCountries.length > 0,
      });
    }

    return { milestones, signatureCollector, continentBadges };
  }, [userEntries, dishes, countries]);

  const toggleRegion = (region: string) => {
    setExpandedRegions((prev) => {
      const next = new Set(prev);
      if (next.has(region)) next.delete(region);
      else next.add(region);
      return next;
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold text-[var(--bb-warm-900)]">
        Progress Dashboard
      </h1>

      {/* ── Tab navigation ───────────────────────────────────────── */}
      <div className="flex gap-1 bg-[var(--bb-warm-100)] rounded-lg p-1">
        {(["overview", "timeline", "achievements"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all capitalize cursor-pointer ${
              activeTab === tab
                ? "bg-white shadow-sm text-[var(--bb-warm-900)]"
                : "text-[var(--bb-warm-800)]/60 hover:text-[var(--bb-warm-900)]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ─────────────────────────────────────────── */}
      {activeTab === "overview" && (
        <>
          {/* Global Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-[var(--bb-warm-200)] p-5 text-center">
              <p className="text-3xl font-bold text-[var(--bb-amber-600)]">
                {stats.totalTried}
              </p>
              <p className="text-sm text-[var(--bb-warm-800)]/60 mt-1">
                Dishes Tried
              </p>
              <p className="text-xs text-[var(--bb-warm-800)]/40">
                of {stats.totalAvailable} available
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-[var(--bb-warm-200)] p-5 text-center">
              <p className="text-3xl font-bold text-[var(--bb-amber-600)]">
                {stats.countriesStarted}
              </p>
              <p className="text-sm text-[var(--bb-warm-800)]/60 mt-1">
                Countries Started
              </p>
              <p className="text-xs text-[var(--bb-warm-800)]/40">
                of {stats.totalCountries}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-[var(--bb-warm-200)] p-5 text-center">
              <p className="text-3xl font-bold text-[var(--bb-green-500)]">
                {stats.countriesCompleted}
              </p>
              <p className="text-sm text-[var(--bb-warm-800)]/60 mt-1">
                Countries Completed
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-[var(--bb-warm-200)] p-5 flex items-center justify-center">
              <CircularProgress percentage={stats.percentage} size={110} strokeWidth={8} />
            </div>
          </div>

          {/* Regional Breakdown */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-[var(--bb-warm-900)]">
              Regional Breakdown
            </h2>
            {regionBreakdown.size === 0 ? (
              <p className="text-sm text-[var(--bb-warm-800)]/60 italic">
                No data available yet. Start exploring countries!
              </p>
            ) : (
              Array.from(regionBreakdown.entries()).map(([region, data]) => {
                const regionTried = data.countries.reduce((s, c) => s + c.tried, 0);
                const regionTotal = data.countries.reduce((s, c) => s + c.total, 0);
                const regionPct = regionTotal > 0 ? (regionTried / regionTotal) * 100 : 0;
                const isExpanded = expandedRegions.has(region);

                return (
                  <div
                    key={region}
                    className="bg-white rounded-xl shadow-sm border border-[var(--bb-warm-200)] overflow-hidden"
                  >
                    <button
                      onClick={() => toggleRegion(region)}
                      className="w-full flex items-center gap-4 px-5 py-4 hover:bg-[var(--bb-warm-50)] transition-colors cursor-pointer"
                    >
                      <span
                        className={`text-xs transition-transform ${isExpanded ? "rotate-90" : ""}`}
                      >
                        &#9654;
                      </span>
                      <span className="font-medium text-sm text-[var(--bb-warm-900)] flex-shrink-0">
                        {region}
                      </span>
                      <MiniProgressBar percentage={regionPct} />
                      <span className="text-xs text-[var(--bb-warm-800)]/60 whitespace-nowrap">
                        {regionTried}/{regionTotal} ({Math.round(regionPct)}%)
                      </span>
                    </button>
                    {isExpanded && (
                      <div className="border-t border-[var(--bb-warm-200)] px-5 py-3 space-y-2 bg-[var(--bb-warm-50)]">
                        {data.countries.map((c) => {
                          const pct = c.total > 0 ? (c.tried / c.total) * 100 : 0;
                          return (
                            <div
                              key={c.id}
                              className="flex items-center gap-3 py-1 cursor-pointer hover:bg-[var(--bb-warm-100)] rounded px-2 -mx-2 transition-colors"
                            >
                              <span className="text-sm text-[var(--bb-warm-900)] min-w-[120px]">
                                {c.name}
                              </span>
                              <MiniProgressBar percentage={pct} />
                              <span className="text-xs text-[var(--bb-warm-800)]/60 whitespace-nowrap">
                                {c.tried}/{c.total}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </section>
        </>
      )}

      {/* ── Timeline Tab ─────────────────────────────────────────── */}
      {activeTab === "timeline" && (
        <section className="space-y-6">
          {timeline.entries.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-[var(--bb-warm-200)] p-12 text-center">
              <p className="text-lg text-[var(--bb-warm-800)]/60">
                No dishes tried yet.
              </p>
              <p className="text-sm text-[var(--bb-warm-800)]/40 mt-1">
                Start exploring countries and marking dishes as tried!
              </p>
            </div>
          ) : (
            Array.from(timeline.grouped.entries()).map(([, entries]) => {
              const date = entries[0]?.triedDate
                ? new Date(entries[0].triedDate)
                : new Date();
              const monthLabel = date.toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
              });
              return (
                <div key={monthLabel}>
                  <h3 className="text-sm font-semibold text-[var(--bb-amber-600)] uppercase tracking-wide mb-3">
                    {monthLabel}
                  </h3>
                  <div className="space-y-2">
                    {entries.map((entry) => (
                      <div
                        key={entry.dishId}
                        className="bg-white rounded-lg shadow-sm border border-[var(--bb-warm-200)] px-5 py-3 flex items-center gap-4"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--bb-warm-900)] truncate">
                            {entry.dishName}
                          </p>
                          <p className="text-xs text-[var(--bb-warm-800)]/60">
                            {entry.countryName}
                          </p>
                        </div>
                        {entry.rating !== null && (
                          <div className="flex gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <span
                                key={i}
                                className={`text-sm ${i < entry.rating! ? "text-[var(--bb-amber-400)]" : "text-[var(--bb-warm-200)]"}`}
                              >
                                &#9733;
                              </span>
                            ))}
                          </div>
                        )}
                        <span className="text-xs text-[var(--bb-warm-800)]/40 whitespace-nowrap">
                          {entry.triedDate
                            ? new Date(entry.triedDate).toLocaleDateString(
                                "en-US",
                                { month: "short", day: "numeric" },
                              )
                            : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </section>
      )}

      {/* ── Achievements Tab ─────────────────────────────────────── */}
      {activeTab === "achievements" && (
        <section className="space-y-8">
          {/* Milestone badges */}
          <div>
            <h2 className="text-lg font-semibold text-[var(--bb-warm-900)] mb-4">
              Milestones
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {achievements.milestones.map((m) => (
                <div
                  key={m.id}
                  className={`rounded-xl border p-5 text-center transition-all ${
                    m.unlocked
                      ? "bg-[var(--bb-amber-50)] border-[var(--bb-amber-300)] shadow-sm"
                      : "bg-[var(--bb-warm-50)] border-[var(--bb-warm-200)] opacity-50"
                  }`}
                >
                  <div
                    className={`text-3xl mb-2 ${m.unlocked ? "" : "grayscale"}`}
                  >
                    {m.id === "first-bite" && (m.unlocked ? "🍽" : "🍽")}
                    {m.id === "explorer" && (m.unlocked ? "🧭" : "🧭")}
                    {m.id === "globetrotter" && (m.unlocked ? "🌍" : "🌍")}
                    {m.id === "world-foodie" && (m.unlocked ? "👨‍🍳" : "👨‍🍳")}
                  </div>
                  <p
                    className={`text-sm font-semibold ${m.unlocked ? "text-[var(--bb-amber-700)]" : "text-[var(--bb-warm-800)]/60"}`}
                  >
                    {m.label}
                  </p>
                  <p className="text-xs text-[var(--bb-warm-800)]/40 mt-1">
                    {m.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Signature Collector */}
          <div>
            <h2 className="text-lg font-semibold text-[var(--bb-warm-900)] mb-4">
              Special Badges
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <div
                className={`rounded-xl border p-5 text-center transition-all ${
                  achievements.signatureCollector.unlocked
                    ? "bg-[var(--bb-amber-50)] border-[var(--bb-amber-300)] shadow-sm"
                    : "bg-[var(--bb-warm-50)] border-[var(--bb-warm-200)] opacity-50"
                }`}
              >
                <div className="text-3xl mb-2">
                  {achievements.signatureCollector.unlocked ? "✨" : "✨"}
                </div>
                <p
                  className={`text-sm font-semibold ${
                    achievements.signatureCollector.unlocked
                      ? "text-[var(--bb-amber-700)]"
                      : "text-[var(--bb-warm-800)]/60"
                  }`}
                >
                  {achievements.signatureCollector.label}
                </p>
                <p className="text-xs text-[var(--bb-warm-800)]/40 mt-1">
                  {achievements.signatureCollector.description}
                </p>
                <p className="text-xs text-[var(--bb-amber-600)] mt-2 font-medium">
                  {achievements.signatureCollector.progress}
                </p>
              </div>
            </div>
          </div>

          {/* Continent badges */}
          <div>
            <h2 className="text-lg font-semibold text-[var(--bb-warm-900)] mb-4">
              Regional Mastery
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {achievements.continentBadges.map((badge) => (
                <div
                  key={badge.id}
                  className={`rounded-xl border p-5 text-center transition-all ${
                    badge.unlocked
                      ? "bg-green-50 border-green-300 shadow-sm"
                      : "bg-[var(--bb-warm-50)] border-[var(--bb-warm-200)] opacity-50"
                  }`}
                >
                  <div className="text-3xl mb-2">
                    {badge.unlocked ? "🏆" : "🔒"}
                  </div>
                  <p
                    className={`text-sm font-semibold ${
                      badge.unlocked
                        ? "text-[var(--bb-green-600)]"
                        : "text-[var(--bb-warm-800)]/60"
                    }`}
                  >
                    {badge.label}
                  </p>
                  <p className="text-xs text-[var(--bb-warm-800)]/40 mt-1">
                    {badge.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="h-8" />
    </div>
  );
}
