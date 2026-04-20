import { NavLink, Outlet, useLocation } from "react-router-dom";
import DesktopSidebar from "./DesktopSidebar";
import FloatingLogPill from "./FloatingLogPill";
import StatusStrip from "./StatusStrip";

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

  return (
    <div className="flex h-svh w-full">
      {/* ── Desktop left sidebar — hidden on mobile ───────────────── */}
      <aside className="hidden md:flex w-[170px] shrink-0 flex-col bg-[#1c1410] text-[var(--bb-sidebar-text)]">
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
        {isMapRoute && (
          <div className="absolute top-2 left-2 right-2 z-10 md:hidden">
            <StatusStrip />
          </div>
        )}

        {/* On map route: no overflow container so the map fills the space.
            On other routes: overflow-auto + bottom padding for the tab bar. */}
        <main className={isMapRoute ? "flex-1 min-h-0 h-full" : "flex-1 overflow-auto pb-16 md:pb-0"}>
          <Outlet />
        </main>
      </div>

      {/* ── Desktop right sidebar — hidden on mobile ──────────────── */}
      <div className="hidden md:block">
        <DesktopSidebar />
      </div>

      {/* ── Floating log pill — map route only ────────────────────── */}
      {isMapRoute && <FloatingLogPill />}

      {/* ── Mobile bottom tab bar — hidden on desktop ─────────────── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 flex md:hidden bg-white/95 backdrop-blur-sm border-t border-gray-200"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
                isActive
                  ? "text-[var(--bb-warm-900)]"
                  : "text-gray-400"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-lg text-lg ${
                    isActive ? "bg-[var(--bb-warm-900)] text-white" : ""
                  }`}
                >
                  {tab.icon}
                </span>
                <span
                  className={`text-[10px] leading-tight ${
                    isActive ? "font-bold" : "font-normal"
                  }`}
                >
                  {tab.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
