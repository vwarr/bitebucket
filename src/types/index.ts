// ── Region & Geographic Types ────────────────────────────────────────

export type Region =
  | "East Asia"
  | "Southeast Asia"
  | "South Asia"
  | "Central Asia"
  | "Middle East"
  | "North Africa"
  | "West Africa"
  | "East Africa"
  | "Southern Africa"
  | "Western Europe"
  | "Eastern Europe"
  | "Scandinavia"
  | "North America"
  | "Central America & Caribbean"
  | "South America"
  | "Oceania";

export type Continent =
  | "Asia"
  | "Africa"
  | "Europe"
  | "North America"
  | "South America"
  | "Oceania";

// ── Country ──────────────────────────────────────────────────────────

export interface Country {
  id: number;
  name: string;
  /** ISO 3166-1 alpha-2 */
  code: string;
  region: Region;
  continent: Continent;
}

// ── Dish Enums & Helpers ─────────────────────────────────────────────

export type AllergenType =
  | "gluten"
  | "dairy"
  | "tree-nuts"
  | "peanuts"
  | "shellfish"
  | "fish"
  | "soy"
  | "eggs"
  | "sesame";

export type DietaryRestriction =
  | "vegetarian"
  | "vegan"
  | "halal"
  | "kosher"
  | "low-sodium"
  | "nightshade-free";

export type SpiceLevel = "mild" | "medium" | "hot" | "extreme";

export type DishCategory =
  | "appetizer"
  | "main"
  | "dessert"
  | "street food"
  | "beverage"
  | "snack";

export type DishDifficulty =
  | "easily available"
  | "regional"
  | "rare/travel-required";

export interface DishAllergen {
  allergen: AllergenType;
  confidence: "always" | "sometimes";
}

// ── Dish ─────────────────────────────────────────────────────────────

export interface Dish {
  id: number;
  countryId: number;
  name: string;
  /** Name in original script (e.g. Japanese, Hindi, Arabic) */
  nameOriginal: string;
  description: string;
  fullDescription: string;
  category: DishCategory;
  isSignature: boolean;
  spiceLevel: SpiceLevel;
  difficulty: DishDifficulty;
  keyIngredients: string[];
  allergens: DishAllergen[];
  imageUrl?: string;
}

// ── User Data ────────────────────────────────────────────────────────

export type DishStatus = "untried" | "tried" | "want-to-try" | "skipped";

export interface UserDishEntry {
  dishId: number;
  status: DishStatus;
  rating: number | null;
  notes: string | null;
  triedDate: string | null;
}

export interface UserProfile {
  allergens: AllergenType[];
  dietaryRestrictions: DietaryRestriction[];
  customRestrictions: string[];
  maxSpiceLevel: SpiceLevel;
  hideFiltered: boolean;
  excludeFilteredFromProgress: boolean;
}

// ── Toast ─────────────────────────────────────────────────────────────

export interface ToastMessage {
  dishName: string;
  countryName: string;
  countryFlag: string;
  isFirstInCountry: boolean;
}
