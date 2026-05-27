import type { Database } from "sql.js";

import { persist } from "../db/database";
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
    // Backfill capital/population for existing rows that may have been seeded before these columns existed
    try {
      const updateStmt = db.prepare(
        "UPDATE countries SET capital = ?, population = ? WHERE id = ? AND (capital IS NULL OR population IS NULL)"
      );
      for (const c of allCountries) {
        updateStmt.run([c.capital ?? null, c.population ?? null, c.id]);
      }
      updateStmt.free();
    } catch {
      // ignore
    }

    // Idempotent backfill of any newly-added seed rows (countries/dishes that
    // didn't exist when this user's DB was first seeded). INSERT OR IGNORE is
    // safe because the explicit integer primary keys mean existing rows are
    // skipped and only genuinely-new rows are inserted.
    try {
      backfillMissingRows(db);
      persist();
    } catch {
      // ignore — backfill is best-effort and must never break loading
    }

    return; // Already seeded
  }

  db.run("BEGIN TRANSACTION");

  try {
    // Insert countries
    const countryStmt = db.prepare(
      "INSERT INTO countries (id, name, code, region, continent, capital, population) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    for (const c of allCountries) {
      countryStmt.run([c.id, c.name, c.code, c.region, c.continent, c.capital ?? null, c.population ?? null]);
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

/**
 * Idempotently insert any seed countries/dishes/allergens that are not yet
 * present in an already-seeded database. Used on the "already seeded" path so
 * existing users (whose DB is persisted in localStorage) receive newly-added
 * countries without wiping their personal data.
 *
 * - `countries` and `dishes` have explicit integer primary keys, so
 *   `INSERT OR IGNORE` safely skips rows that already exist.
 * - `dish_allergens` has an AUTOINCREMENT id and NO unique constraint, so a
 *   blind re-insert would create duplicates. We therefore only insert allergen
 *   rows for dishes that currently have zero allergen rows.
 */
export function backfillMissingRows(db: Database): void {
  db.run("BEGIN TRANSACTION");
  try {
    const countryStmt = db.prepare(
      "INSERT OR IGNORE INTO countries (id, name, code, region, continent, capital, population) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    for (const c of allCountries) {
      countryStmt.run([
        c.id,
        c.name,
        c.code,
        c.region,
        c.continent,
        c.capital ?? null,
        c.population ?? null,
      ]);
    }
    countryStmt.free();

    const dishStmt = db.prepare(
      `INSERT OR IGNORE INTO dishes (id, country_id, name, name_original, description, full_description, category, is_signature, spice_level, difficulty, key_ingredients)
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

      // Only insert allergens if this dish has none yet, to avoid duplicates
      // (dish_allergens has no unique constraint, so a blind insert would dupe).
      const countRows = db.exec(
        "SELECT COUNT(*) FROM dish_allergens WHERE dish_id = ?",
        [d.id]
      );
      const existingAllergens =
        countRows.length > 0 ? (countRows[0].values[0][0] as number) : 0;

      if (existingAllergens === 0) {
        for (const a of d.allergens) {
          allergenStmt.run([d.id, a.allergen, a.confidence]);
        }
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
