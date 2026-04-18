import type {
  Continent,
  DishAllergen,
  DishCategory,
  DishDifficulty,
  Region,
  SpiceLevel,
} from "../types";

export interface SeedCountry {
  id: number;
  name: string;
  code: string; // ISO 3166-1 alpha-2
  region: Region;
  continent: Continent;
}

export interface SeedDish {
  id: number;
  countryId: number;
  name: string;
  nameOriginal: string;
  description: string;
  fullDescription: string;
  category: DishCategory;
  isSignature: boolean;
  spiceLevel: SpiceLevel;
  difficulty: DishDifficulty;
  keyIngredients: string[];
  allergens: DishAllergen[];
}
