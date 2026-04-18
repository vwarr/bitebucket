import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAppStore } from "./stores/appStore";
import Layout from "./components/Layout";
import WorldMap from "./components/WorldMap";
import CountryListPage from "./pages/CountryListPage";
import CountryPage from "./pages/CountryPage";
import CategoryPage from "./pages/CategoryPage";
import ProgressPage from "./pages/ProgressPage";
import DiscoverPage from "./pages/DiscoverPage";
import SettingsPage from "./pages/SettingsPage";
import DishDetail from "./components/DishDetail";
import CountryPreviewPanel from "./components/CountryPreviewPanel";

export default function App() {
  const loaded = useAppStore((s) => s.loaded);
  const loadError = useAppStore((s) => s.loadError);
  const loadData = useAppStore((s) => s.loadData);
  const selectedDishId = useAppStore((s) => s.selectedDishId);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!loaded) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-[var(--bb-warm-50)]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-amber-200 border-t-amber-500" />
          <p className="text-lg font-medium text-amber-800">
            Loading BiteBucket...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {loadError && (
        <pre style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999,
          background: "#fee", color: "#900", padding: "12px",
          fontSize: "11px", whiteSpace: "pre-wrap", maxHeight: "40vh", overflow: "auto"
        }}>[loadError]{"\n"}{loadError}</pre>
      )}
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/map" replace />} />
          <Route path="map" element={<WorldMap />} />
          <Route path="countries" element={<CountryListPage />} />
          <Route path="country/:id" element={<CountryPage />} />
          <Route path="categories" element={<CategoryPage />} />
          <Route path="progress" element={<ProgressPage />} />
          <Route path="discover" element={<DiscoverPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
      {selectedDishId !== null && <DishDetail />}
      <CountryPreviewPanel />
    </>
  );
}
