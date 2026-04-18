import { useState } from "react";
import { useAppStore } from "../stores/appStore";
import type { DishCategory } from "../types";

interface SuggestDishFormProps {
  open: boolean;
  onClose: () => void;
  /** Pre-select a country when opening from a country page */
  defaultCountryId?: number;
}

interface SuggestionPayload {
  countryId: number;
  dishName: string;
  description: string;
  category: DishCategory;
  keyIngredients: string;
  submittedAt: string;
}

const CATEGORIES: DishCategory[] = [
  "appetizer",
  "main",
  "dessert",
  "street food",
  "beverage",
  "snack",
];

const STORAGE_KEY = "bitebucket:dish-suggestions";

function saveSuggestion(payload: SuggestionPayload) {
  const existing = localStorage.getItem(STORAGE_KEY);
  const queue: SuggestionPayload[] = existing ? JSON.parse(existing) : [];
  queue.push(payload);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

export default function SuggestDishForm({
  open,
  onClose,
  defaultCountryId,
}: SuggestDishFormProps) {
  const countries = useAppStore((s) => s.countries);

  const [countryId, setCountryId] = useState<number | "">(defaultCountryId ?? "");
  const [dishName, setDishName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<DishCategory | "">("");
  const [ingredients, setIngredients] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setCountryId(defaultCountryId ?? "");
    setDishName("");
    setDescription("");
    setCategory("");
    setIngredients("");
    setSubmitted(false);
    setError("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!countryId || !dishName.trim() || !category) {
      setError("Please fill in all required fields.");
      return;
    }

    saveSuggestion({
      countryId: Number(countryId),
      dishName: dishName.trim(),
      description: description.trim(),
      category,
      keyIngredients: ingredients.trim(),
      submittedAt: new Date().toISOString(),
    });

    setSubmitted(true);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-[fadeIn_200ms_ease-out]"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
      role="dialog"
      aria-modal="true"
      aria-label="Suggest a missing dish"
    >
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden animate-[scaleIn_250ms_ease-out]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Suggest a Dish
          </h2>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {submitted ? (
            /* ── Success state ──────────────────────────────── */
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Thank you!
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Your suggestion has been queued for editorial review.
                </p>
              </div>
              <button
                onClick={handleClose}
                className="px-6 py-2.5 rounded-xl bg-purple-500 text-white font-medium text-sm hover:bg-purple-600 transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            /* ── Form ───────────────────────────────────────── */
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-sm border border-red-200 dark:border-red-800">
                  {error}
                </div>
              )}

              {/* Country */}
              <div className="space-y-1.5">
                <label
                  htmlFor="suggest-country"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Country <span className="text-red-400">*</span>
                </label>
                <select
                  id="suggest-country"
                  value={countryId}
                  onChange={(e) => setCountryId(e.target.value ? Number(e.target.value) : "")}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400 transition-all"
                >
                  <option value="">Select a country</option>
                  {[...countries]
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Dish name */}
              <div className="space-y-1.5">
                <label
                  htmlFor="suggest-name"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Dish Name <span className="text-red-400">*</span>
                </label>
                <input
                  id="suggest-name"
                  type="text"
                  value={dishName}
                  onChange={(e) => setDishName(e.target.value)}
                  placeholder="e.g., Khao Soi"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-gray-900 dark:text-white text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400 transition-all"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label
                  htmlFor="suggest-desc"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Description
                </label>
                <textarea
                  id="suggest-desc"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the dish..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-gray-900 dark:text-white text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400 resize-none transition-all"
                />
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label
                  htmlFor="suggest-category"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Category <span className="text-red-400">*</span>
                </label>
                <select
                  id="suggest-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as DishCategory)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400 transition-all capitalize"
                >
                  <option value="">Select a category</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c} className="capitalize">
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Ingredients */}
              <div className="space-y-1.5">
                <label
                  htmlFor="suggest-ingredients"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Key Ingredients
                </label>
                <input
                  id="suggest-ingredients"
                  type="text"
                  value={ingredients}
                  onChange={(e) => setIngredients(e.target.value)}
                  placeholder="e.g., coconut milk, curry paste, egg noodles"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-gray-900 dark:text-white text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400 transition-all"
                />
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Comma-separated list
                </p>
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-purple-500 text-white font-semibold text-sm hover:bg-purple-600 active:bg-purple-700 transition-colors shadow-sm shadow-purple-500/25"
              >
                Submit Suggestion
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
