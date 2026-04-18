import { create } from "zustand";
import type { StateCreator } from "zustand";
import { persist } from "zustand/middleware";
import type { PersistOptions } from "zustand/middleware";
import type {
  Country,
  Dish,
  DishCategory,
  DishStatus,
  Region,
  SpiceLevel,
  ToastMessage,
  UserDishEntry,
  UserProfile,
} from "../types";

const SPICE_ORDER: Record<SpiceLevel, number> = {
  mild: 0,
  medium: 1,
  hot: 2,
  extreme: 3,
};

export interface DataSlice {
  loaded: boolean;
  loadError: string | null;
  countries: Country[];
  dishes: Dish[];
  loadData: () => Promise<void>;
}

export interface ProfileSlice {
  profile: UserProfile;
  updateProfile: (partial: Partial<UserProfile>) => void;
  isDishFiltered: (dish: Dish) => boolean;
  getDishWarnings: (dish: Dish) => string[];
}

export interface ProgressSlice {
  userEntries: Map<number, UserDishEntry>;
  setDishStatus: (dishId: number, status: DishStatus) => void;
  setDishRating: (dishId: number, rating: number) => void;
  setDishNotes: (dishId: number, notes: string) => void;
  getCountryProgress: (countryId: number) => { tried: number; total: number; percentage: number };
  getGlobalProgress: () => { countriesStarted: number; countriesCompleted: number; totalTried: number; totalDishes: number; percentage: number };
  getTimeline: () => UserDishEntry[];
  getWantToTryDishes: () => Array<{ dish: Dish; country: Country }>;
  getRecentlyTried: (limit?: number) => Array<{ entry: UserDishEntry; dish: Dish; country: Country }>;
  getStreak: () => number;
  getCountriesByStatus: () => { completed: number; started: number; toGo: number };
}

export interface UISlice {
  selectedCountryId: number | null;
  selectedDishId: number | null;
  previewedCountryId: number | null;
  searchQuery: string;
  activeView: "map" | "countries" | "categories" | "progress" | "discover" | "settings";
  categoryFilter: DishCategory | null;
  regionFilter: Region | null;
  selectCountry: (countryId: number | null) => void;
  selectDish: (dishId: number | null) => void;
  previewCountry: (countryId: number | null) => void;
  closePreview: () => void;
  setView: (view: "map" | "countries" | "categories" | "progress" | "discover" | "settings") => void;
  setSearchQuery: (query: string) => void;
  setCategoryFilter: (category: DishCategory | null) => void;
  setRegionFilter: (region: Region | null) => void;
  onboardingComplete: boolean;
  setOnboardingComplete: (complete: boolean) => void;
  showLogSheet: boolean;
  openLogSheet: () => void;
  closeLogSheet: () => void;
  logSearchQuery: string;
  setLogSearchQuery: (q: string) => void;
  logConfirmDishId: number | null;
  setLogConfirmDish: (id: number | null) => void;
  showCommandPalette: boolean;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toastMessage: ToastMessage | null;
  showToast: (msg: ToastMessage) => void;
  hideToast: () => void;
}

export type AppState = DataSlice & ProfileSlice & ProgressSlice & UISlice;

const DEFAULT_PROFILE: UserProfile = {
  allergens: [],
  dietaryRestrictions: [],
  customRestrictions: [],
  maxSpiceLevel: "extreme",
  hideFiltered: false,
  excludeFilteredFromProgress: false,
};

function ensureEntry(entries: Map<number, UserDishEntry>, dishId: number): UserDishEntry {
  const existing = entries.get(dishId);
  if (existing) return existing;
  return { dishId, status: "untried", rating: null, notes: null, triedDate: null };
}

const createDataSlice: StateCreator<AppState, [], [], DataSlice> = (set) => ({
  loaded: false,
  loadError: null,
  countries: [],
  dishes: [],
  loadData: async () => {
    try {
      const db = await import("../db");
      await db.initDB();
      const countries = db.getCountries();
      const dishes = db.getDishes();
      set({ countries, dishes, loaded: true, loadError: null });
    } catch (err) {
      const msg = err instanceof Error ? `${err.message}\n${err.stack}` : String(err);
      console.error("[appStore] Failed to load data:", err);
      set({ loaded: true, loadError: msg });
    }
  },
});

const createProfileSlice: StateCreator<AppState, [], [], ProfileSlice> = (set, get) => ({
  profile: DEFAULT_PROFILE,

  updateProfile: (partial) => {
    set((state) => ({ profile: { ...state.profile, ...partial } }));
    import("../db").then((db) => { if (typeof db.saveProfile === "function") db.saveProfile(get().profile); }).catch(() => {});
  },

  isDishFiltered: (dish) => {
    const { profile } = get();
    for (const da of dish.allergens) {
      if (da.confidence === "always" && profile.allergens.includes(da.allergen)) return true;
    }
    if (SPICE_ORDER[dish.spiceLevel] > SPICE_ORDER[profile.maxSpiceLevel]) return true;
    if (profile.dietaryRestrictions.length > 0) {
      const ingredients = dish.keyIngredients.map((i) => i.toLowerCase());
      const desc = dish.description.toLowerCase();
      for (const restriction of profile.dietaryRestrictions) {
        switch (restriction) {
          case "vegan":
            if (ingredients.some((i) => i.includes("meat") || i.includes("chicken") || i.includes("pork") || i.includes("beef") || i.includes("lamb") || i.includes("fish") || i.includes("shrimp") || i.includes("egg") || i.includes("milk") || i.includes("cheese") || i.includes("butter") || i.includes("cream") || i.includes("honey")) || dish.allergens.some((a) => a.confidence === "always" && ["dairy", "eggs", "fish", "shellfish"].includes(a.allergen))) return true;
            break;
          case "vegetarian":
            if (ingredients.some((i) => i.includes("meat") || i.includes("chicken") || i.includes("pork") || i.includes("beef") || i.includes("lamb") || i.includes("fish") || i.includes("shrimp")) || dish.allergens.some((a) => a.confidence === "always" && ["fish", "shellfish"].includes(a.allergen))) return true;
            break;
          case "halal":
            if (ingredients.some((i) => i.includes("pork") || i.includes("bacon")) || desc.includes("pork") || desc.includes("bacon")) return true;
            break;
          case "kosher":
            if (ingredients.some((i) => i.includes("pork") || i.includes("shellfish") || i.includes("shrimp")) || dish.allergens.some((a) => a.confidence === "always" && a.allergen === "shellfish")) return true;
            break;
          case "nightshade-free":
            if (ingredients.some((i) => i.includes("tomato") || i.includes("pepper") || i.includes("potato") || i.includes("eggplant") || i.includes("paprika") || i.includes("chili"))) return true;
            break;
          default:
            break;
        }
      }
    }
    return false;
  },

  getDishWarnings: (dish) => {
    const { profile } = get();
    const warnings: string[] = [];
    for (const da of dish.allergens) {
      if (profile.allergens.includes(da.allergen)) {
        warnings.push(da.confidence === "always" ? `Contains ${da.allergen} (confirmed)` : `May contain ${da.allergen}`);
      }
    }
    if (SPICE_ORDER[dish.spiceLevel] > SPICE_ORDER[profile.maxSpiceLevel]) {
      warnings.push(`Spice level "${dish.spiceLevel}" exceeds your max "${profile.maxSpiceLevel}"`);
    }
    return warnings;
  },
});

const createProgressSlice: StateCreator<AppState, [], [], ProgressSlice> = (set, get) => ({
  userEntries: new Map<number, UserDishEntry>(),

  setDishStatus: (dishId, status) => {
    set((state) => {
      const next = new Map(state.userEntries);
      const entry = ensureEntry(next, dishId);
      next.set(dishId, { ...entry, status, triedDate: status === "tried" && !entry.triedDate ? new Date().toISOString() : status === "tried" ? entry.triedDate : null });
      return { userEntries: next };
    });
  },

  setDishRating: (dishId, rating) => {
    set((state) => {
      const next = new Map(state.userEntries);
      const entry = ensureEntry(next, dishId);
      next.set(dishId, { ...entry, rating });
      return { userEntries: next };
    });
  },

  setDishNotes: (dishId, notes) => {
    set((state) => {
      const next = new Map(state.userEntries);
      const entry = ensureEntry(next, dishId);
      next.set(dishId, { ...entry, notes });
      return { userEntries: next };
    });
  },

  getCountryProgress: (countryId) => {
    const { dishes, userEntries, profile } = get();
    const isDishFiltered = get().isDishFiltered;
    let countryDishes = dishes.filter((d) => d.countryId === countryId);
    if (profile.excludeFilteredFromProgress) {
      countryDishes = countryDishes.filter((d) => !isDishFiltered(d));
    }
    const total = countryDishes.length;
    const tried = countryDishes.filter((d) => userEntries.get(d.id)?.status === "tried").length;
    return { tried, total, percentage: total > 0 ? Math.round((tried / total) * 100) : 0 };
  },

  getGlobalProgress: () => {
    const { countries, dishes, userEntries, profile } = get();
    const isDishFiltered = get().isDishFiltered;
    const getCountryProgress = get().getCountryProgress;
    let activeDishes = dishes;
    if (profile.excludeFilteredFromProgress) {
      activeDishes = dishes.filter((d) => !isDishFiltered(d));
    }
    const totalDishes = activeDishes.length;
    const totalTried = activeDishes.filter((d) => userEntries.get(d.id)?.status === "tried").length;
    let countriesStarted = 0;
    let countriesCompleted = 0;
    for (const country of countries) {
      const progress = getCountryProgress(country.id);
      if (progress.tried > 0) countriesStarted++;
      if (progress.total > 0 && progress.tried === progress.total) countriesCompleted++;
    }
    return { countriesStarted, countriesCompleted, totalTried, totalDishes, percentage: totalDishes > 0 ? Math.round((totalTried / totalDishes) * 100) : 0 };
  },

  getTimeline: () => {
    const { userEntries } = get();
    return Array.from(userEntries.values()).filter((e) => e.triedDate !== null).sort((a, b) => new Date(b.triedDate!).getTime() - new Date(a.triedDate!).getTime());
  },

  getWantToTryDishes: () => {
    const { dishes, countries, userEntries } = get();
    const result: Array<{ dish: Dish; country: Country }> = [];
    for (const dish of dishes) {
      const entry = userEntries.get(dish.id);
      if (entry?.status === "want-to-try") {
        const country = countries.find((c) => c.id === dish.countryId);
        if (country) result.push({ dish, country });
      }
    }
    return result;
  },

  getRecentlyTried: (limit = 5) => {
    const { dishes, countries, userEntries } = get();
    const tried: Array<{ entry: UserDishEntry; dish: Dish; country: Country }> = [];
    for (const entry of userEntries.values()) {
      if (entry.status === "tried" && entry.triedDate !== null) {
        const dish = dishes.find((d) => d.id === entry.dishId);
        if (dish) {
          const country = countries.find((c) => c.id === dish.countryId);
          if (country) tried.push({ entry, dish, country });
        }
      }
    }
    tried.sort((a, b) => new Date(b.entry.triedDate!).getTime() - new Date(a.entry.triedDate!).getTime());
    return tried.slice(0, limit);
  },

  getStreak: () => {
    const { userEntries } = get();
    const triedDates = new Set<string>();
    for (const entry of userEntries.values()) {
      if (entry.status === "tried" && entry.triedDate !== null) {
        triedDates.add(new Date(entry.triedDate).toISOString().slice(0, 10));
      }
    }
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; ; i++) {
      const day = new Date(today);
      day.setDate(today.getDate() - i);
      const dateStr = day.toISOString().slice(0, 10);
      if (triedDates.has(dateStr)) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  },

  getCountriesByStatus: () => {
    const { countries } = get();
    const getCountryProgress = get().getCountryProgress;
    let completed = 0;
    let started = 0;
    let toGo = 0;
    for (const country of countries) {
      const progress = getCountryProgress(country.id);
      if (progress.total === 0) continue;
      if (progress.tried === progress.total) {
        completed++;
      } else if (progress.tried > 0) {
        started++;
      } else {
        toGo++;
      }
    }
    return { completed, started, toGo };
  },
});

const createUISlice: StateCreator<AppState, [], [], UISlice> = (set) => ({
  selectedCountryId: null,
  selectedDishId: null,
  previewedCountryId: null,
  searchQuery: "",
  activeView: "map",
  categoryFilter: null,
  regionFilter: null,

  selectCountry: (countryId) => set({ selectedCountryId: countryId, selectedDishId: null }),
  selectDish: (dishId) => set({ selectedDishId: dishId }),
  previewCountry: (countryId) => set({ previewedCountryId: countryId }),
  closePreview: () => set({ previewedCountryId: null }),
  setView: (view) => set({ activeView: view, ...(view !== "map" && view !== "countries" ? { selectedCountryId: null, selectedDishId: null } : {}) }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setCategoryFilter: (category) => set({ categoryFilter: category }),
  setRegionFilter: (region) => set({ regionFilter: region }),

  onboardingComplete: false,
  setOnboardingComplete: (complete) => set({ onboardingComplete: complete }),

  showLogSheet: false,
  openLogSheet: () => set({ showLogSheet: true, logSearchQuery: "", logConfirmDishId: null }),
  closeLogSheet: () => set({ showLogSheet: false, logSearchQuery: "", logConfirmDishId: null }),

  logSearchQuery: "",
  setLogSearchQuery: (q) => set({ logSearchQuery: q }),

  logConfirmDishId: null,
  setLogConfirmDish: (id) => set({ logConfirmDishId: id }),

  showCommandPalette: false,
  openCommandPalette: () => set({ showCommandPalette: true }),
  closeCommandPalette: () => set({ showCommandPalette: false }),

  toastMessage: null,
  showToast: (msg) => set({ toastMessage: msg }),
  hideToast: () => set({ toastMessage: null }),
});

type PersistedState = Pick<AppState, "profile" | "userEntries" | "onboardingComplete">;

const persistOptions: PersistOptions<AppState, PersistedState> = {
  name: "bitebucket-user-data",
  partialize: (state) => ({ profile: state.profile, userEntries: state.userEntries, onboardingComplete: state.onboardingComplete }),
  storage: {
    getItem: (name) => {
      const raw = localStorage.getItem(name);
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw);
        if (parsed.state?.userEntries) {
          parsed.state.userEntries = new Map<number, UserDishEntry>(parsed.state.userEntries);
        }
        return parsed;
      } catch { return null; }
    },
    setItem: (name, value) => {
      const serializable = { ...value, state: { ...value.state, userEntries: Array.from((value.state.userEntries as Map<number, UserDishEntry>).entries()) } };
      localStorage.setItem(name, JSON.stringify(serializable));
    },
    removeItem: (name) => localStorage.removeItem(name),
  },
};

export const useAppStore = create<AppState>()(
  persist(
    (...a) => ({
      ...createDataSlice(...a),
      ...createProfileSlice(...a),
      ...createProgressSlice(...a),
      ...createUISlice(...a),
    }),
    persistOptions,
  ),
);
