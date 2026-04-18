import { useMemo } from "react";
import { useAppStore } from "../stores/appStore";
import type { Dish, Country } from "../types";

// ── Helpers ──────────────────────────────────────────────────────────

function flagEmoji(code: string): string {
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

function dayOfWeek(): string {
  return new Date().toLocaleDateString("en-US", { weekday: "short" });
}

function formatTriedDate(isoDate: string | null): string {
  if (!isoDate) return "";
  const d = new Date(isoDate);
  return d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
}

function renderStars(rating: number | null): string {
  if (!rating) return "";
  return "★".repeat(rating) + "☆".repeat(5 - rating);
}

// ── Section wrapper ───────────────────────────────────────────────────

function Section({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 py-3 border-b border-amber-100 last:border-b-0">
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold tracking-widest text-amber-600 uppercase mb-2">
      {children}
    </p>
  );
}

// ── Sub-sections ─────────────────────────────────────────────────────

function TodaySection({ streak }: { streak: number }) {
  return (
    <Section>
      <SectionLabel>Today</SectionLabel>
      <p className="text-lg font-bold text-amber-900 leading-tight">
        {dayOfWeek()}{streak > 0 ? ` · 🔥 ${streak}d streak` : ""}
      </p>
    </Section>
  );
}

function CountriesSection({
  completed,
  started,
  toGo,
}: {
  completed: number;
  started: number;
  toGo: number;
}) {
  const total = completed + started + toGo;
  return (
    <Section>
      <SectionLabel>Countries · {total} Total</SectionLabel>
      <div className="flex rounded-lg overflow-hidden border border-amber-200 text-[10px] font-bold tracking-wide">
        <div className="flex-1 bg-green-100 text-green-800 flex flex-col items-center py-1.5 gap-0.5">
          <span className="text-base font-bold text-green-700 leading-tight">{completed}</span>
          <span>✓ COMPLETE</span>
        </div>
        <div className="flex-1 bg-amber-100 text-amber-800 flex flex-col items-center py-1.5 gap-0.5 border-x border-amber-200">
          <span className="text-base font-bold text-amber-700 leading-tight">{started}</span>
          <span>● STARTED</span>
        </div>
        <div className="flex-1 bg-white text-gray-500 flex flex-col items-center py-1.5 gap-0.5 border-dashed">
          <span className="text-base font-bold text-gray-600 leading-tight">{toGo}</span>
          <span>○ TO GO</span>
        </div>
      </div>
    </Section>
  );
}

function DishesSection({
  tried,
  total,
  percentage,
}: {
  tried: number;
  total: number;
  percentage: number;
}) {
  return (
    <Section>
      <SectionLabel>Dishes · {total} Total</SectionLabel>
      <p className="text-2xl font-bold tabular-nums text-amber-900 leading-none mb-2">
        {tried}
        <span className="text-base font-semibold text-amber-600"> / {total}</span>
        <span className="text-sm font-medium text-amber-500 ml-2">· {percentage}%</span>
      </p>
      {/* Progress bar */}
      <div className="w-full h-2 bg-amber-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-amber-400 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </Section>
  );
}

function WantToTrySection({
  items,
  onMarkTried,
}: {
  items: Array<{ dish: Dish; country: Country }>;
  onMarkTried: (dishId: number) => void;
}) {
  if (items.length === 0) return null;

  return (
    <Section>
      <SectionLabel>📌 Want to try · {items.length}</SectionLabel>
      <ul className="space-y-2">
        {items.map(({ dish, country }) => (
          <li
            key={dish.id}
            className="flex items-center gap-2"
          >
            {/* Thumbnail placeholder — hatched pattern */}
            <div
              className="w-8 h-8 rounded-md shrink-0 border border-amber-200"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(45deg, #fde68a 0, #fde68a 1px, #fffbeb 0, #fffbeb 50%)",
                backgroundSize: "6px 6px",
              }}
            />
            {/* Name + flag */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-amber-900 truncate leading-tight">
                {dish.name}
                <span className="ml-1 font-normal">{flagEmoji(country.code)}</span>
              </p>
            </div>
            {/* Mark tried */}
            <button
              type="button"
              onClick={() => onMarkTried(dish.id)}
              className="shrink-0 w-6 h-6 flex items-center justify-center rounded-md border-2 border-amber-300 text-amber-700 hover:border-green-500 hover:bg-green-50 hover:text-green-700 transition-all text-xs font-bold"
              aria-label={`Mark ${dish.name} as tried`}
              title="Mark as tried"
            >
              ✓
            </button>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function RecentSection({
  items,
}: {
  items: Array<{
    entry: { dishId: number; rating: number | null; triedDate: string | null };
    dish: Dish;
    country: Country;
  }>;
}) {
  if (items.length === 0) return null;

  return (
    <Section>
      <SectionLabel>🕓 Recent</SectionLabel>
      <ul className="space-y-1.5">
        {items.map(({ entry, dish, country }) => (
          <li
            key={dish.id}
            className="text-xs text-gray-700 leading-snug"
          >
            <span className="font-mono text-[10px] text-gray-400 mr-1.5 uppercase tracking-wide">
              {formatTriedDate(entry.triedDate)}
            </span>
            <span className="font-bold text-amber-900">{dish.name}</span>
            <span className="text-gray-500">
              {" "}· {flagEmoji(country.code)}
              {entry.rating ? ` ${renderStars(entry.rating)}` : ""}
            </span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function TryNextSection({
  recommendations,
}: {
  recommendations: Array<{ dish: Dish; country: Country; reason: string }>;
}) {
  if (recommendations.length === 0) return null;

  return (
    <Section>
      <SectionLabel>🧭 Try next</SectionLabel>
      <ul className="space-y-2">
        {recommendations.map(({ dish, country, reason }) => (
          <li
            key={dish.id}
            className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2"
          >
            <p className="text-xs font-bold text-amber-900 leading-tight truncate">
              {dish.name}{" "}
              <span className="font-normal">{flagEmoji(country.code)}</span>
            </p>
            <p className="text-[10px] text-amber-600 mt-0.5 italic">{reason}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}

// ── Recommendations logic ────────────────────────────────────────────

function useRecommendations(
  dishes: Dish[],
  countries: Country[],
  userEntries: Map<number, import("../types").UserDishEntry>,
  getCountryProgress: (id: number) => { tried: number; total: number; percentage: number },
  limit = 3,
): Array<{ dish: Dish; country: Country; reason: string }> {
  return useMemo(() => {
    const triedCountryIds = new Set<number>();
    const triedRegions: Record<string, number> = {};

    for (const entry of userEntries.values()) {
      if (entry.status === "tried") {
        const d = dishes.find((x) => x.id === entry.dishId);
        if (d) {
          triedCountryIds.add(d.countryId);
          const c = countries.find((x) => x.id === d.countryId);
          if (c) triedRegions[c.region] = (triedRegions[c.region] ?? 0) + 1;
        }
      }
    }

    // Most tried region (to suggest dishes from other regions)
    const mostTriedRegion = Object.entries(triedRegions).sort((a, b) => b[1] - a[1])[0]?.[0];

    // Find untried dishes not in want-to-try or skipped
    const untried = dishes.filter((d) => {
      const s = userEntries.get(d.id)?.status ?? "untried";
      return s === "untried";
    });

    // Prefer dishes from new countries (not yet started)
    const fromNewCountries = untried.filter(
      (d) => !triedCountryIds.has(d.countryId),
    );

    // From different regions
    const fromOtherRegions = untried.filter((d) => {
      const c = countries.find((x) => x.id === d.countryId);
      return c && c.region !== mostTriedRegion;
    });

    const candidates: Array<{ dish: Dish; country: Country; reason: string }> = [];

    // Shuffle helper
    const pick = (arr: Dish[]): Dish | null => {
      if (arr.length === 0) return null;
      return arr[Math.floor(Math.random() * arr.length)];
    };

    const used = new Set<number>();

    const addCandidate = (d: Dish | null, reason: string) => {
      if (!d || used.has(d.id)) return;
      const c = countries.find((x) => x.id === d.countryId);
      if (!c) return;
      used.add(d.id);
      candidates.push({ dish: d, country: c, reason });
    };

    addCandidate(pick(fromNewCountries), "new country to explore");
    addCandidate(pick(fromOtherRegions.filter((d) => !used.has(d.id))), "different region");
    addCandidate(
      pick(untried.filter((d) => !used.has(d.id) && d.isSignature)),
      "signature dish",
    );

    // Pad with random untried if needed
    if (candidates.length < limit) {
      const remaining = untried.filter((d) => !used.has(d.id));
      while (candidates.length < limit && remaining.length > 0) {
        const idx = Math.floor(Math.random() * remaining.length);
        const d = remaining.splice(idx, 1)[0];
        const c = countries.find((x) => x.id === d.countryId);
        if (c) candidates.push({ dish: d, country: c, reason: "worth trying" });
      }
    }

    return candidates.slice(0, limit);
  }, [dishes, countries, userEntries, getCountryProgress, limit]); // eslint-disable-line react-hooks/exhaustive-deps
}

// ── Main component ───────────────────────────────────────────────────

export default function DesktopSidebar() {
  const getCountriesByStatus = useAppStore((s) => s.getCountriesByStatus);
  const getGlobalProgress = useAppStore((s) => s.getGlobalProgress);
  const getStreak = useAppStore((s) => s.getStreak);
  const getWantToTryDishes = useAppStore((s) => s.getWantToTryDishes);
  const getRecentlyTried = useAppStore((s) => s.getRecentlyTried);
  const setDishStatus = useAppStore((s) => s.setDishStatus);
  const setLogConfirmDish = useAppStore((s) => s.setLogConfirmDish);
  const openLogSheet = useAppStore((s) => s.openLogSheet);
  const countries = useAppStore((s) => s.countries);
  const dishes = useAppStore((s) => s.dishes);
  const userEntries = useAppStore((s) => s.userEntries);
  const getCountryProgress = useAppStore((s) => s.getCountryProgress);

  const streak = getStreak();
  const { completed, started, toGo } = getCountriesByStatus();
  const { totalTried, totalDishes, percentage } = getGlobalProgress();
  const wantToTry = getWantToTryDishes();
  const recentlyTried = getRecentlyTried(5);
  const recommendations = useRecommendations(
    dishes,
    countries,
    userEntries,
    getCountryProgress,
    3,
  );

  const handleMarkTried = (dishId: number) => {
    setDishStatus(dishId, "tried");
    setLogConfirmDish(dishId);
    openLogSheet();
  };

  return (
    <aside
      className="flex w-[280px] shrink-0 flex-col border-l border-amber-100 bg-white overflow-y-auto"
      aria-label="Today panel"
    >
      <TodaySection streak={streak} />

      <CountriesSection
        completed={completed}
        started={started}
        toGo={toGo}
      />

      <DishesSection
        tried={totalTried}
        total={totalDishes}
        percentage={percentage}
      />

      <WantToTrySection
        items={wantToTry}
        onMarkTried={handleMarkTried}
      />

      <RecentSection items={recentlyTried} />

      <TryNextSection recommendations={recommendations} />
    </aside>
  );
}
