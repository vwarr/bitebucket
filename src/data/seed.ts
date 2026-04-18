import type { Database } from "sql.js";

import { asiaCountries, asiaDishes } from "./seed-asia";
import { menaAfricaCountries, menaAfricaDishes } from "./seed-mena-africa";
import { europeCountries, europeDishes } from "./seed-europe";
import {
  americasOceaniaCountries,
  americasOceaniaDishes,
} from "./seed-americas-oceania";

// ── Combined seed data ──────────────────────────────────────────────

export const allCountries = [
  ...asiaCountries,
  ...menaAfricaCountries,
  ...europeCountries,
  ...americasOceaniaCountries,
];

export const allDishes = [
  ...asiaDishes,
  ...menaAfricaDishes,
  ...europeDishes,
  ...americasOceaniaDishes,
];

// ── Seed function ───────────────────────────────────────────────────

export function seedDatabase(db: Database): void {
  // Check if data already exists
  const existing = db.exec("SELECT COUNT(*) FROM countries");
  if (existing.length > 0 && (existing[0].values[0][0] as number) > 0) {
    return; // Already seeded
  }

  db.run("BEGIN TRANSACTION");

  try {
    // Insert countries
    const countryStmt = db.prepare(
      "INSERT INTO countries (id, name, code, region, continent) VALUES (?, ?, ?, ?, ?)"
    );
    for (const c of allCountries) {
      countryStmt.run([c.id, c.name, c.code, c.region, c.continent]);
    }
    countryStmt.free();

    // Insert dishes
    const dishStmt = db.prepare(
      `INSERT INTO dishes (id, country_id, name, name_original, description, full_description, category, is_signature, spice_level, difficulty, key_ingredients)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const allergenStmt = db.prepare(
      "INSERT INTO dish_allergens (dish_id, allergen, confidence) VALUES (?, ?, ?)"
    );

    for (const d of allDishes) {
      dishStmt.run([
        d.id,
        d.countryId,
        d.name,
        d.nameOriginal,
        d.description,
        d.fullDescription,
        d.category,
        d.isSignature ? 1 : 0,
        d.spiceLevel,
        d.difficulty,
        JSON.stringify(d.keyIngredients),
      ]);

      for (const a of d.allergens) {
        allergenStmt.run([d.id, a.allergen, a.confidence]);
      }
    }

    dishStmt.free();
    allergenStmt.free();

    db.run("COMMIT");
  } catch (err) {
    db.run("ROLLBACK");
    throw err;
  }
}
