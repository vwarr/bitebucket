import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAppStore, ONBOARDING_VERSION } from "./stores/appStore";
import Layout from "./components/Layout";
import CountryListPage from "./pages/CountryListPage";
import CountryPage from "./pages/CountryPage";
import ProgressPage from "./pages/ProgressPage";
import MePage from "./pages/MePage";
import DishDetail from "./components/DishDetail";
import Onboarding from "./components/Onboarding";
import LogSheet from "./components/LogSheet";
import LogConfirm from "./components/LogConfirm";
import SuccessToast from "./components/SuccessToast";
import CountryBottomSheet from "./components/CountryBottomSheet";
import CountryPreviewPanel from "./components/CountryPreviewPanel";
import CommandPalette from "./components/CommandPalette";
import SuggestDishForm from "./components/SuggestDishForm";
import MilestoneUnlockToast from "./components/MilestoneUnlockToast";

export default function App() {
  const loaded = useAppStore((s) => s.loaded);
  const loadError = useAppStore((s) => s.loadError);
  const loadData = useAppStore((s) => s.loadData);
  // Onboarding gate uses versioning so future required-step bumps re-trigger the flow.
  const onboardingVersion = useAppStore((s) => s.onboardingVersion);
  const selectedDishId = useAppStore((s) => s.selectedDishId);
  const showLogSheet = useAppStore((s) => s.showLogSheet);
  const logConfirmDishId = useAppStore((s) => s.logConfirmDishId);
  const toastMessage = useAppStore((s) => s.toastMessage);
  const showSuggestForm = useAppStore((s) => s.showSuggestForm);
  const closeSuggestForm = useAppStore((s) => s.closeSuggestForm);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Block onboarding until data is loaded (it needs the classics list);
  // otherwise render the layout immediately so the map's static GeoJSON
  // paints with no spinner. Pins/colors fill in once `loaded` flips true.
  if (onboardingVersion < ONBOARDING_VERSION) {
    if (!loaded) {
      return (
        <div className="flex w-full min-h-svh items-center justify-center bg-[var(--bb-warm-50)]">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-amber-200 border-t-amber-500" />
            <p className="text-lg font-medium text-amber-800">
              Loading BiteBucket...
            </p>
          </div>
        </div>
      );
    }
    return <Onboarding />;
  }

  return (
    <>
      {loadError && (
        <pre
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
            background: "#fee",
            color: "#900",
            padding: "12px",
            fontSize: "11px",
            whiteSpace: "pre-wrap",
            maxHeight: "40vh",
            overflow: "auto",
          }}
        >
          [loadError]{"\n"}
          {loadError}
        </pre>
      )}
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/map" replace />} />
          {/* The map route renders nothing through the Outlet: <WorldMap/>
              is mounted permanently inside Layout and merely hidden when
              off the map route, so it never unmounts/remounts (no GeoJSON
              re-parse or Leaflet re-init) on navigation. See Layout.tsx. */}
          <Route path="map" element={null} />
          <Route path="countries" element={<CountryListPage />} />
          <Route path="country/:id" element={<CountryPage />} />
          <Route path="progress" element={<ProgressPage />} />
          <Route path="me" element={<MePage />} />
        </Route>
      </Routes>

      {/* Overlays */}
      {selectedDishId !== null && <DishDetail />}
      <div className="md:hidden">
        <CountryBottomSheet />
      </div>
      <div className="hidden md:block">
        <CountryPreviewPanel />
      </div>
      {showLogSheet && <LogSheet />}
      {logConfirmDishId !== null && <LogConfirm />}
      {toastMessage && <SuccessToast />}
      <CommandPalette />
      <SuggestDishForm open={showSuggestForm} onClose={closeSuggestForm} />
      <MilestoneUnlockToast />
    </>
  );
}
