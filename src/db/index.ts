import {
  initDatabase,
  getCountries as dbGetCountries,
  getAllDishes,
  persist as dbPersist,
} from "./database";
import { seedDatabase, backfillMissingRows } from "../data/seed";

/**
 * Bump this version whenever seed data changes so that existing users
 * get their countries/dishes tables re-populated with the latest dataset.
 */
const SEED_VERSION = 4;
const SEED_VERSION_KEY = "bitebucket_seed_version";

export async function initDB() {
  const db = await initDatabase();

  const storedVersion = Number(localStorage.getItem(SEED_VERSION_KEY) || "0");

  // Seed if empty OR if seed version has been bumped
  const countRows = db.exec("SELECT COUNT(*) FROM countries");
  const count = countRows.length > 0 ? (countRows[0].values[0][0] as number) : 0;

  if (count === 0 || storedVersion < SEED_VERSION) {
    // Clear old seed data so we can re-insert cleanly
    if (count > 0) {
      db.run("DELETE FROM dish_allergens");
      db.run("DELETE FROM dishes");
      db.run("DELETE FROM countries");
    }
    seedDatabase(db);
    localStorage.setItem(SEED_VERSION_KEY, String(SEED_VERSION));
    dbPersist();
  }

  // Self-healing: always run an idempotent backfill of any seed
  // countries/dishes/allergens missing from the user's local DB, even when the
  // stored version already matches SEED_VERSION. This guarantees that future
  // seed additions show up on next load without needing a version bump, and
  // never touches user progress (user_dish_entries is never modified).
  try {
    backfillMissingRows(db);
    dbPersist();
  } catch {
    // best-effort — backfill must never break app loading
  }

  return db;
}

export function getCountries() {
  return dbGetCountries();
}

export function getDishes() {
  return getAllDishes();
}

export { saveUserProfile as saveProfile } from "./database";
export { getUserProfile as loadProfile } from "./database";
