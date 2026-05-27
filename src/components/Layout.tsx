import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAppStore } from "../stores/appStore";
import DesktopSidebar from "./DesktopSidebar";
import FloatingLogPill from "./FloatingLogPill";
import StatusStrip from "./StatusStrip";
import WelcomeCallout from "./WelcomeCallout";
import WorldMap from "./WorldMap";

// ── Tab / Nav items ──────────────────────────────────────────────────

const tabs = [
  { to: "/map", label: "Map", icon: "🌍" },
  { to: "/countries", label: "Countries", icon: "📖" },
  { to: "/progress", label: "Progress", icon: "📊" },
  { to: "/me", label: "Me", icon: "👤" },
];

// ── Layout ───────────────────────────────────────────────────────────

export default function Layout() {
  const location = useLocation();
  const isMapRoute = location.pathname === "/map" || location.pathname === "/";
  const showWelcomeCallout = useAppStore((s) => s.showWelcomeCallout);

  return (
    <div className="flex h-svh w-full">
      {/* ── Desktop left sidebar — hidden on mobile ───────────────── */}
      <aside className="hidden md:flex w-[170px] shrink-0 flex-col bg-[var(--bb-sidebar-bg)] text-[var(--bb-sidebar-text)]">
        {/* Logo */}
        <div className="flex h-14 items-center px-4 border-b border-white/5">
          <span
            className="text-lg font-bold text-amber-400"
            style={{ fontFamily: "'Georgia', 'Palatino', cursive" }}
          >
            🍱 BiteBucket
          </span>
        </div>

        {/* Nav items */}
        <nav className="mt-3 flex flex-1 flex-col gap-1 px-2">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-amber-500/20 text-amber-400"
                    : "text-[var(--bb-sidebar-text)] hover:bg-[var(--bb-sidebar-hover)] hover:text-amber-300"
                }`
              }
            >
              <span className="text-base">{tab.icon}</span>
              <span>{tab.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* ⌘K hint */}
        <div className="px-4 pb-4 pt-2 border-t border-white/5">
          <p className="text-xs text-[var(--bb-sidebar-text)]/40 text-center">
            ⌘K search &amp; log
          </p>
        </div>
      </aside>

      {/* ── Main content area ─────────────────────────────────────── */}
      <div className="flex flex-1 flex-col min-h-0 relative">
        {/* Status strip overlay — map route only, mobile */}
        {isMapRoute && !showWelcomeCallout && (
          <div className="absolute top-2 left-2 right-2 z-20 md:hidden">
            <StatusStrip />
          </div>
        )}

        {/* Welcome callout — first map render after onboarding */}
        {isMapRoute && showWelcomeCallout && <WelcomeCallout />}

        {/* The world map is mounted PERMANENTLY (eager) and only hidden when
            off the map route — never unmounted — so returning to the
            homescreen and panning is instant (no ~400-feature GeoJSON
            re-parse or Leaflet re-init). It's hidden with `display:none`
            rather than conditional rendering; WorldMap's MapResizer
            invalidates the map size when it becomes visible again. */}
        <main
          className={
            isMapRoute
              ? "flex-1 min-h-0 h-full"
              : "hidden"
          }
        >
          <WorldMap />
        </main>

        {/* Non-map routes render through the Outlet. The map route's element
            is null (see App.tsx) since the map above handles that view. */}
        {!isMapRoute && (
          <main className="bb-page-scroll flex-1 overflow-auto pb-16 md:pb-0">
            <Outlet />
          </main>
        )}
      </div>

      {/* ── Desktop right sidebar — hidden on mobile ──────────────── */}
      <div className="hidden md:block">
        <DesktopSidebar />
      </div>

      {/* ── Floating log pill — map route only ────────────────────── */}
      {isMapRoute && <FloatingLogPill />}

      {/* ── Mobile bottom tab bar — hidden on desktop ─────────────── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 flex md:hidden bg-white/95 backdrop-blur-sm border-t border-gray-200 px-1.5 pt-1.5"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 6px)" }}
      >
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className="flex flex-1 items-center justify-center"
          >
            {({ isActive }) => (
              <span
                className={`mx-0.5 flex flex-1 flex-col items-center justify-center py-1.5 gap-0.5 rounded-lg transition-all ${
                  isActive
                    ? "bg-[var(--bb-warm-900)] text-[var(--bb-warm-50)]"
                    : "text-gray-400"
                }`}
                style={
                  isActive
                    ? { boxShadow: "0 0 0 2px var(--bb-accent, #f59e0b)" }
                    : undefined
                }
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center text-lg ${
                    isActive ? "" : "opacity-50"
                  }`}
                >
                  {tab.icon}
                </span>
                <span
                  className={`text-[10px] leading-tight ${
                    isActive
                      ? "font-bold text-[var(--bb-warm-50)]"
                      : "font-normal text-gray-500"
                  }`}
                >
                  {tab.label}
                </span>
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
