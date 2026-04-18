import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAppStore } from "./stores/appStore";
import Layout from "./components/Layout";
import WorldMap from "./components/WorldMap";
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
import CommandPalette from "./components/CommandPalette";

export default function App() {
  const loaded = useAppStore((s) => s.loaded);
  const loadError = useAppStore((s) => s.loadError);
  const loadData = useAppStore((s) => s.loadData);
  const onboardingComplete = useAppStore((s) => s.onboardingComplete);
  const selectedDishId = useAppStore((s) => s.selectedDishId);
  const showLogSheet = useAppStore((s) => s.showLogSheet);
  const logConfirmDishId = useAppStore((s) => s.logConfirmDishId);
  const toastMessage = useAppStore((s) => s.toastMessage);

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

  if (!onboardingComplete) {
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
          <Route path="map" element={<WorldMap />} />
          <Route path="countries" element={<CountryListPage />} />
          <Route path="country/:id" element={<CountryPage />} />
          <Route path="progress" element={<ProgressPage />} />
          <Route path="me" element={<MePage />} />
        </Route>
      </Routes>

      {/* Overlays */}
      {selectedDishId !== null && <DishDetail />}
      <CountryBottomSheet />
      {showLogSheet && <LogSheet />}
      {logConfirmDishId !== null && <LogConfirm />}
      {toastMessage && <SuccessToast />}
      <CommandPalette />
    </>
  );
}
