import initSqlJs, { type Database } from "sql.js";
import sqlWasmUrl from "sql.js/dist/sql-wasm.wasm?url";
import type {
  AllergenType,
  Country,
  Dish,
  DishAllergen,
  DishStatus,
  Region,
  SpiceLevel,
  UserDishEntry,
  UserProfile,
  DishCategory,
  DishDifficulty,
  Continent,
} from "../types";

// ── Module-level singleton ───────────────────────────────────────────

const DB_STORAGE_KEY = "bitebucket_db";
let db: Database | null = null;

// ── Persistence helpers ──────────────────────────────────────────────

function saveToLocalStorage(database: Database): void {
  const data = database.export();
  const uint8 = new Uint8Array(data);
  const chunks: string[] = [];
  const chunkSize = 8192;
  for (let i = 0; i < uint8.length; i += chunkSize) {
    chunks.push(String.fromCharCode(...uint8.subarray(i, i + chunkSize)));
  }
  const encoded = btoa(chunks.join(""));
  localStorage.setItem(DB_STORAGE_KEY, encoded);
}

function loadFromLocalStorage(): Uint8Array | null {
  const encoded = localStorage.getItem(DB_STORAGE_KEY);
  if (!encoded) return null;
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ── Schema ───────────────────────────────────────────────────────────

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS countries (
    id          INTEGER PRIMARY KEY,
    name        TEXT    NOT NULL,
    code        TEXT    NOT NULL,
    region      TEXT    NOT NULL,
    continent   TEXT    NOT NULL
  );

  CREATE TABLE IF NOT EXISTS dishes (
    id              INTEGER PRIMARY KEY,
    country_id      INTEGER NOT NULL REFERENCES countries(id),
    name            TEXT    NOT NULL,
    name_original   TEXT    NOT NULL DEFAULT '',
    description     TEXT    NOT NULL DEFAULT '',
    full_description TEXT   NOT NULL DEFAULT '',
    category        TEXT    NOT NULL DEFAULT 'main',
    is_signature    INTEGER NOT NULL DEFAULT 0,
    spice_level     TEXT    NOT NULL DEFAULT 'mild',
    difficulty      TEXT    NOT NULL DEFAULT 'easily available',
    key_ingredients TEXT    NOT NULL DEFAULT '[]',
    image_url       TEXT
  );

  CREATE TABLE IF NOT EXISTS dish_allergens (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    dish_id     INTEGER NOT NULL REFERENCES dishes(id),
    allergen    TEXT    NOT NULL,
    confidence  TEXT    NOT NULL DEFAULT 'always'
  );

  CREATE TABLE IF NOT EXISTS user_dish_entries (
    dish_id     INTEGER PRIMARY KEY REFERENCES dishes(id),
    status      TEXT    NOT NULL DEFAULT 'untried',
    rating      INTEGER,
    notes       TEXT,
    tried_date  TEXT
  );

  CREATE TABLE IF NOT EXISTS user_profile (
    id                            INTEGER PRIMARY KEY CHECK (id = 1),
    allergens                     TEXT NOT NULL DEFAULT '[]',
    dietary_restrictions          TEXT NOT NULL DEFAULT '[]',
    custom_restrictions           TEXT NOT NULL DEFAULT '[]',
    max_spice_level               TEXT NOT NULL DEFAULT 'extreme',
    hide_filtered                 INTEGER NOT NULL DEFAULT 0,
    exclude_filtered_from_progress INTEGER NOT NULL DEFAULT 0
  );
`;

// ── Initialisation ───────────────────────────────────────────────────

export async function initDatabase(): Promise<Database> {
  if (db) return db;

  const SQL = await initSqlJs({
    locateFile: () => sqlWasmUrl,
  });

  const existing = loadFromLocalStorage();
  db = existing ? new SQL.Database(existing) : new SQL.Database();

  db.run(SCHEMA);

  // Ensure there is always a profile row
  const profileRows = db.exec("SELECT COUNT(*) FROM user_profile");
  if (profileRows.length === 0 || (profileRows[0].values[0][0] as number) === 0) {
    db.run("INSERT OR IGNORE INTO user_profile (id) VALUES (1)");
  }

  saveToLocalStorage(db);
  return db;
}

/** Persist current state to localStorage. Call after mutations. */
export function persist(): void {
  if (db) saveToLocalStorage(db);
}

/** Get the raw db handle (must call initDatabase first). */
export function getDb(): Database {
  if (!db) throw new Error("Database not initialised. Call initDatabase() first.");
  return db;
}

// ── Query Helpers ────────────────────────────────────────────────────

export function getCountries(): Country[] {
  const d = getDb();
  const rows = d.exec("SELECT id, name, code, region, continent FROM countries ORDER BY name");
  if (rows.length === 0) return [];
  return rows[0].values.map((r) => ({
    id: r[0] as number,
    name: r[1] as string,
    code: r[2] as string,
    region: r[3] as Region,
    continent: r[4] as Continent,
  }));
}

export function getDishesByCountry(countryId: number): Dish[] {
  const d = getDb();
  const rows = d.exec(
    "SELECT id, country_id, name, name_original, description, full_description, category, is_signature, spice_level, difficulty, key_ingredients, image_url FROM dishes WHERE country_id = ? ORDER BY is_signature DESC, name",
    [countryId]
  );
  if (rows.length === 0) return [];
  return rows[0].values.map((r) => rowToDish(r, d));
}

export function getDishById(dishId: number): Dish | null {
  const d = getDb();
  const rows = d.exec(
    "SELECT id, country_id, name, name_original, description, full_description, category, is_signature, spice_level, difficulty, key_ingredients, image_url FROM dishes WHERE id = ?",
    [dishId]
  );
  if (rows.length === 0 || rows[0].values.length === 0) return null;
  return rowToDish(rows[0].values[0], d);
}

export function getAllDishes(): Dish[] {
  const d = getDb();
  const rows = d.exec(
    "SELECT id, country_id, name, name_original, description, full_description, category, is_signature, spice_level, difficulty, key_ingredients, image_url FROM dishes ORDER BY name"
  );
  if (rows.length === 0) return [];
  return rows[0].values.map((r) => rowToDish(r, d));
}

function rowToDish(r: unknown[], d: Database): Dish {
  const dishId = r[0] as number;
  const allergenRows = d.exec(
    "SELECT allergen, confidence FROM dish_allergens WHERE dish_id = ?",
    [dishId]
  );
  const allergens: DishAllergen[] =
    allergenRows.length > 0
      ? allergenRows[0].values.map((a) => ({
          allergen: a[0] as AllergenType,
          confidence: a[1] as "always" | "sometimes",
        }))
      : [];

  return {
    id: dishId,
    countryId: r[1] as number,
    name: r[2] as string,
    nameOriginal: r[3] as string,
    description: r[4] as string,
    fullDescription: r[5] as string,
    category: r[6] as DishCategory,
    isSignature: (r[7] as number) === 1,
    spiceLevel: r[8] as SpiceLevel,
    difficulty: r[9] as DishDifficulty,
    keyIngredients: JSON.parse(r[10] as string) as string[],
    allergens,
    imageUrl: (r[11] as string) || undefined,
  };
}

// ── User dish entries ────────────────────────────────────────────────

export function updateDishStatus(
  dishId: number,
  status: DishStatus,
  rating?: number | null,
  notes?: string | null
): void {
  const d = getDb();
  const triedDate =
    status === "tried" ? new Date().toISOString().slice(0, 10) : null;

  d.run(
    `INSERT INTO user_dish_entries (dish_id, status, rating, notes, tried_date)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(dish_id) DO UPDATE SET
       status     = excluded.status,
       rating     = excluded.rating,
       notes      = excluded.notes,
       tried_date = COALESCE(excluded.tried_date, user_dish_entries.tried_date)`,
    [dishId, status, rating ?? null, notes ?? null, triedDate]
  );
  persist();
}

export function getUserDishEntry(dishId: number): UserDishEntry | null {
  const d = getDb();
  const rows = d.exec(
    "SELECT dish_id, status, rating, notes, tried_date FROM user_dish_entries WHERE dish_id = ?",
    [dishId]
  );
  if (rows.length === 0 || rows[0].values.length === 0) return null;
  const r = rows[0].values[0];
  return {
    dishId: r[0] as number,
    status: r[1] as DishStatus,
    rating: r[2] as number | null,
    notes: r[3] as string | null,
    triedDate: r[4] as string | null,
    photoUrl: null,
  };
}

export function getAllUserDishEntries(): UserDishEntry[] {
  const d = getDb();
  const rows = d.exec(
    "SELECT dish_id, status, rating, notes, tried_date FROM user_dish_entries"
  );
  if (rows.length === 0) return [];
  return rows[0].values.map((r) => ({
    dishId: r[0] as number,
    status: r[1] as DishStatus,
    rating: r[2] as number | null,
    notes: r[3] as string | null,
    triedDate: r[4] as string | null,
    photoUrl: null,
  }));
}

// ── User profile ─────────────────────────────────────────────────────

export function getUserProfile(): UserProfile {
  const d = getDb();
  const rows = d.exec("SELECT * FROM user_profile WHERE id = 1");
  if (rows.length === 0 || rows[0].values.length === 0) {
    return {
      allergens: [],
      dietaryRestrictions: [],
      customRestrictions: [],
      maxSpiceLevel: "extreme",
      hideFiltered: false,
      excludeFilteredFromProgress: false,
    };
  }
  const r = rows[0].values[0];
  return {
    allergens: JSON.parse(r[1] as string),
    dietaryRestrictions: JSON.parse(r[2] as string),
    customRestrictions: JSON.parse(r[3] as string),
    maxSpiceLevel: r[4] as SpiceLevel,
    hideFiltered: (r[5] as number) === 1,
    excludeFilteredFromProgress: (r[6] as number) === 1,
  };
}

export function saveUserProfile(profile: UserProfile): void {
  const d = getDb();
  d.run(
    `UPDATE user_profile SET
       allergens = ?,
       dietary_restrictions = ?,
       custom_restrictions = ?,
       max_spice_level = ?,
       hide_filtered = ?,
       exclude_filtered_from_progress = ?
     WHERE id = 1`,
    [
      JSON.stringify(profile.allergens),
      JSON.stringify(profile.dietaryRestrictions),
      JSON.stringify(profile.customRestrictions),
      profile.maxSpiceLevel,
      profile.hideFiltered ? 1 : 0,
      profile.excludeFilteredFromProgress ? 1 : 0,
    ]
  );
  persist();
}

// ── Progress ─────────────────────────────────────────────────────────

export interface CountryProgress {
  countryId: number;
  tried: number;
  total: number;
}

export function getProgressByCountry(countryId: number): CountryProgress {
  const d = getDb();
  const totalRows = d.exec(
    "SELECT COUNT(*) FROM dishes WHERE country_id = ?",
    [countryId]
  );
  const triedRows = d.exec(
    `SELECT COUNT(*) FROM user_dish_entries ude
     JOIN dishes d ON d.id = ude.dish_id
     WHERE d.country_id = ? AND ude.status = 'tried'`,
    [countryId]
  );
  return {
    countryId,
    tried: triedRows.length > 0 ? (triedRows[0].values[0][0] as number) : 0,
    total: totalRows.length > 0 ? (totalRows[0].values[0][0] as number) : 0,
  };
}

export interface GlobalProgress {
  totalDishes: number;
  tried: number;
  wantToTry: number;
  skipped: number;
  countriesStarted: number;
  countriesCompleted: number;
  totalCountries: number;
}

export function getGlobalProgress(): GlobalProgress {
  const d = getDb();

  const total = d.exec("SELECT COUNT(*) FROM dishes");
  const tried = d.exec(
    "SELECT COUNT(*) FROM user_dish_entries WHERE status = 'tried'"
  );
  const wantToTry = d.exec(
    "SELECT COUNT(*) FROM user_dish_entries WHERE status = 'want-to-try'"
  );
  const skipped = d.exec(
    "SELECT COUNT(*) FROM user_dish_entries WHERE status = 'skipped'"
  );
  const totalCountries = d.exec("SELECT COUNT(*) FROM countries");

  const countriesStarted = d.exec(
    `SELECT COUNT(DISTINCT d.country_id) FROM user_dish_entries ude
     JOIN dishes d ON d.id = ude.dish_id
     WHERE ude.status = 'tried'`
  );

  // A country is "completed" when all its dishes are tried
  const countriesCompleted = d.exec(
    `SELECT COUNT(*) FROM (
       SELECT d.country_id,
              COUNT(*) AS total,
              SUM(CASE WHEN ude.status = 'tried' THEN 1 ELSE 0 END) AS done
       FROM dishes d
       LEFT JOIN user_dish_entries ude ON ude.dish_id = d.id
       GROUP BY d.country_id
       HAVING done = total
     )`
  );

  const val = (rows: ReturnType<Database["exec"]>) =>
    rows.length > 0 ? (rows[0].values[0][0] as number) : 0;

  return {
    totalDishes: val(total),
    tried: val(tried),
    wantToTry: val(wantToTry),
    skipped: val(skipped),
    countriesStarted: val(countriesStarted),
    countriesCompleted: val(countriesCompleted),
    totalCountries: val(totalCountries),
  };
}
