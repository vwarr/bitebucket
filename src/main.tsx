import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App";

// Defensive cleanup: a Service Worker left over from a previous project on
// this origin (localhost:5173 is Vite's default and is heavily reused) will
// keep intercepting requests and serving its own cached bundle, making code
// changes invisible even after a hard refresh. This app registers no SW, so
// any controller here is stale — unregister it, purge Cache Storage, and
// reload ONCE (guarded so we never loop) to pick up the real, current code.
if ("serviceWorker" in navigator) {
  void (async () => {
    const regs = await navigator.serviceWorker.getRegistrations();
    if (regs.length === 0) return;
    await Promise.all(regs.map((r) => r.unregister()));
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    if (navigator.serviceWorker.controller && !sessionStorage.getItem("bb-sw-purged")) {
      sessionStorage.setItem("bb-sw-purged", "1");
      location.reload();
    }
  })();
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
