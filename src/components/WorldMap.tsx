import { useEffect, useRef } from "react";
import L from "leaflet";
import { useAppStore } from "../stores/appStore";
import geoData from "../data/countries.geo.json";

// ── Types for GeoJSON data ──────────────────────────────────────────

interface GeoFeature {
  type: "Feature";
  properties: {
    ADMIN?: string;
    NAME?: string;
    ISO_A2?: string;
    // "_EH" variants resolve sovereignty-disputed/-99 features
    // (e.g. France, Norway, Kosovo) that lack a plain ISO_A2/A3.
    ISO_A2_EH?: string;
    ISO_A3?: string;
    ISO_A3_EH?: string;
    name?: string;
    [key: string]: unknown;
  };
  geometry: GeoJSON.Geometry;
}

// Normalize a country name for fuzzy matching (lowercase, strip
// punctuation/diacritics). Lets us match Natural-Earth ADMIN/NAME
// strings against our country list when ISO codes are missing.
function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

// Resolve a GeoJSON feature against a flat country array. Tries alpha-2 /
// alpha-3 codes (incl. the "_EH" variants that resolve sovereignty-disputed
// "-99" features) and finally a normalized name match on ADMIN/NAME. Shared
// by the per-layer interaction handlers, which read fresh store state to
// avoid stale closures.
function resolveFromCountries<C extends { name: string; code: string }>(
  feature: GeoFeature,
  countries: C[],
): C | undefined {
  const p = feature.properties;
  const candidates = [p.ISO_A2, p.ISO_A2_EH, p.ISO_A3, p.ISO_A3_EH];
  for (const cand of candidates) {
    if (!cand || cand === "-99") continue;
    const upper = cand.toUpperCase();
    const hit = countries.find((c) => c.code.toUpperCase() === upper);
    if (hit) return hit;
  }
  const name = p.ADMIN ?? p.NAME ?? p.name;
  if (name) {
    const norm = normalizeName(name);
    const hit = countries.find((c) => normalizeName(c.name) === norm);
    if (hit) return hit;
  }
  return undefined;
}

// ── Country color helper ────────────────────────────────────────────

// Returns fill color based on tried percentage and whether the country
// has any want-to-try dishes but no tried dishes yet.
// Colors come from the "journal" design palette in flow-wireframes.html:
//   complete  = good        #16a34a
//   started   = accent      #d97706
//   want-to-try = accent-soft #fde68a
//   untouched = land (cream) #faf3df  (sits on the powder-blue ocean)
function progressColor(percentage: number, hasWantToTry: boolean): string {
  if (percentage >= 100) return "#16a34a"; // good -- complete (100%)
  if (percentage > 0) return "#d97706"; // accent -- started (>0%)
  if (hasWantToTry) return "#fde68a"; // accent-soft -- want-to-try but untried
  return "#faf3df"; // land -- untouched
}

// ── World-wrap helpers ──────────────────────────────────────────────

// Vector (GeoJSON) layers do NOT wrap horizontally the way raster tiles
// do, so panning past ±180° hits empty space. To fake a seamless,
// repeating world we render three copies of every feature, shifted by
// -360°, 0° and +360° of longitude. The shifted clones share the same
// feature `properties` (so resolution/tooltips/clicks behave identically),
// they just live in the neighbouring world copies.
const WORLD_OFFSETS = [-360, 0, 360];

type PositionList = GeoJSON.Position[];

function shiftPosition(pos: GeoJSON.Position, dLng: number): GeoJSON.Position {
  // Only longitude (index 0) is shifted; latitude (and any altitude) is kept.
  return [pos[0] + dLng, pos[1], ...pos.slice(2)];
}

function shiftRing(ring: PositionList, dLng: number): PositionList {
  return ring.map((p) => shiftPosition(p, dLng));
}

// Shift a Polygon/MultiPolygon geometry's longitudes by `dLng`. The source
// data only contains Polygon and MultiPolygon geometries; anything else is
// returned unchanged.
function shiftGeometry(geom: GeoJSON.Geometry, dLng: number): GeoJSON.Geometry {
  if (dLng === 0) return geom;
  if (geom.type === "Polygon") {
    return {
      type: "Polygon",
      coordinates: geom.coordinates.map((ring) => shiftRing(ring, dLng)),
    };
  }
  if (geom.type === "MultiPolygon") {
    return {
      type: "MultiPolygon",
      coordinates: geom.coordinates.map((poly) =>
        poly.map((ring) => shiftRing(ring, dLng)),
      ),
    };
  }
  return geom;
}

// Build a single FeatureCollection containing each source feature plus its
// -360°/+360° clones. We reuse the original `properties` reference on every
// copy so resolution logic is identical for all world copies.
function buildWrappedCollection(
  source: GeoJSON.FeatureCollection,
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  for (const feature of source.features) {
    for (const dLng of WORLD_OFFSETS) {
      features.push({
        type: "Feature",
        properties: feature.properties,
        geometry: shiftGeometry(feature.geometry, dLng),
      });
    }
  }
  return { type: "FeatureCollection", features };
}

// ── Component ───────────────────────────────────────────────────────
//
// This component is imperative: the Leaflet map is created exactly ONCE in a
// mount-only effect and React never re-renders it afterwards. We deliberately
// do NOT call `useAppStore(selector)` in the render body — doing so would
// subscribe the component to the store and re-render (and re-run effects over
// the whole GeoJSON layer) on every log/hover/click, which is what caused the
// old react-leaflet version to flicker. Instead we read state with
// `useAppStore.getState()` and react to changes with `useAppStore.subscribe`,
// mutating the existing Leaflet layers in place.

export default function WorldMap() {
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const geoJsonRef = useRef<L.GeoJSON | null>(null);
  const labelsLayerRef = useRef<L.TileLayer | null>(null);

  useEffect(() => {
    const el = mapDivRef.current;
    if (!el || mapRef.current) return;

    // ── Create the map once (vanilla Leaflet, SVG renderer) ──────────
    // We use the SVG renderer (not canvas) so `layer.setStyle(...)` rewrites
    // each path's fill/stroke attributes and the browser repaints
    // declaratively — every polygon always paints, no ocean bleed-through.
    const map = L.map(el, {
      center: [20, 0],
      zoom: 2,
      minZoom: 2,
      maxZoom: 6,
      zoomControl: true,
      scrollWheelZoom: true,
      preferCanvas: false,
      // SVG renderer with an enlarged buffer. Leaflet's default `padding: 0.1`
      // only paints the viewport + 10% margin, so panning past that edge shows
      // blank space until the SVG re-projects on move. `padding: 4` pre-renders
      // ~4 viewports of buffer in every direction, so a pan is essentially
      // always landing on already-painted area before the next re-render kicks
      // in. The dataset is tiny (177 features × 3 world-wrap copies ≈ a few
      // hundred paths), so even this larger buffer is cheap to keep painted.
      renderer: L.svg({ padding: 4 }),
      // Wrap raster/world coordinates horizontally as the user pans.
      worldCopyJump: true,
      // Constrain VERTICAL panning so you can't scroll into grey emptiness
      // above/below the world, while leaving longitude effectively
      // unconstrained so horizontal wrap keeps working.
      maxBounds: L.latLngBounds([-85, -Infinity], [85, Infinity]),
      maxBoundsViscosity: 1.0,
    });
    mapRef.current = map;

    // Powder-blue ocean background behind the land shapes.
    el.style.background = "#a3c4d6";

    // Labels pane: sits above the GeoJSON, ignores pointer events, only
    // populated with a label tile layer at higher zoom (see updateLabels).
    if (!map.getPane("labels")) {
      const pane = map.createPane("labels");
      pane.style.zIndex = "650";
      pane.style.pointerEvents = "none";
    }

    // ── Style + tooltip helpers (read fresh store state each call) ───
    // These are plain functions (not React callbacks) so the subscription
    // can call them without any React render involvement.

    // Per-restyle context, recomputed from getState() so colours/tooltips
    // always reflect the latest store data.
    function computeContext() {
      const { countries, dishes, userEntries, getCountryProgress } =
        useAppStore.getState();

      const progressByCountryId = new Map<
        number,
        ReturnType<typeof getCountryProgress>
      >();
      for (const c of countries) {
        progressByCountryId.set(c.id, getCountryProgress(c.id));
      }

      // Country IDs that have at least one want-to-try (but maybe untried) dish.
      const wantToTryCountryIds = new Set<number>();
      for (const [dishId, entry] of userEntries) {
        if (entry.status === "want-to-try") {
          const dish = dishes.find((d) => d.id === dishId);
          if (dish) wantToTryCountryIds.add(dish.countryId);
        }
      }

      return { countries, progressByCountryId, wantToTryCountryIds };
    }

    let ctx = computeContext();

    function styleFor(feature?: GeoJSON.Feature): L.PathOptions {
      if (!feature) return {};
      const country = resolveFromCountries(
        feature as GeoFeature,
        ctx.countries,
      );
      const prog = country
        ? ctx.progressByCountryId.get(country.id) ?? null
        : null;
      const hasWantToTry = country
        ? ctx.wantToTryCountryIds.has(country.id)
        : false;
      const fill = progressColor(prog ? prog.percentage : 0, hasWantToTry);
      const isUntouched = !country || (!prog?.tried && !hasWantToTry);
      // Land must read as solid cream / status color, never a translucent
      // wash that blends into the powder-blue ocean. Even unsupported
      // territories (no Country match) render as solid land — they share the
      // untouched cream (#faf3df) fill — rather than near-transparent water.
      // Borders use ink (#1a1a1a) for the hand-drawn "journal" line treatment;
      // status countries get a lighter cream hairline so the fill reads cleanly.
      return {
        fillColor: fill,
        fillOpacity: 1,
        color: isUntouched ? "#1a1a1a" : "#fff7ed",
        weight: 1,
        opacity: isUntouched ? 0.45 : 0.7,
      };
    }

    function tooltipFor(feature: GeoFeature): string {
      const country = resolveFromCountries(feature, ctx.countries);
      const name =
        country?.name ?? feature.properties.ADMIN ?? feature.properties.name ?? "Unknown";
      const prog = country
        ? ctx.progressByCountryId.get(country.id) ?? null
        : null;
      return prog
        ? `<strong>${name}</strong><br/>${prog.percentage}% explored`
        : `<strong>${name}</strong>`;
    }

    // ── GeoJSON layer (added once, with ±360° world-wrap copies) ─────
    const wrapped = buildWrappedCollection(
      geoData as unknown as GeoJSON.FeatureCollection,
    );

    const geoJsonLayer = L.geoJSON(wrapped, {
      style: (feature) => styleFor(feature),
      onEachFeature: (feature, layer) => {
        const geo = feature as GeoFeature;
        layer.bindTooltip(tooltipFor(geo), {
          sticky: true,
          direction: "top",
          offset: [0, -8],
        });

        layer.on({
          mouseover: (e: L.LeafletMouseEvent) => {
            const target = e.target as L.Path;
            // Land already renders at full opacity, so highlight via a
            // heavier border rather than dimming the fill.
            target.setStyle({ weight: 2, opacity: 1 });
            target.bringToFront();
          },
          mouseout: (e: L.LeafletMouseEvent) => {
            const target = e.target as L.Path & { feature?: GeoJSON.Feature };
            // Restore the exact resting style (color/weight/opacity depend on
            // whether the country is untouched), matching `styleFor` rather
            // than hardcoding values that could drift.
            target.setStyle(styleFor(target.feature));
          },
          click: () => {
            // Resolve from FRESH store state — handlers are bound once and
            // `countries` hydrates async, so a captured value would be stale.
            const fresh = resolveFromCountries(
              geo,
              useAppStore.getState().countries,
            );
            if (fresh) {
              useAppStore.getState().previewCountry(fresh.id);
            }
          },
        });
      },
    });
    geoJsonLayer.addTo(map);
    geoJsonRef.current = geoJsonLayer;

    // ── Imperative recolor (no React render) ─────────────────────────
    // Recompute lookups from getState() and rewrite every layer's style +
    // tooltip in place. The SVG renderer turns setStyle into attribute
    // writes, so this is a cheap synchronous repaint.
    function recolor() {
      ctx = computeContext();
      const layer = geoJsonRef.current;
      if (!layer) return;
      layer.setStyle((feature) => styleFor(feature));
      layer.eachLayer((child) => {
        const fl = child as L.Layer & {
          feature?: GeoJSON.Feature;
          setTooltipContent?: (c: string) => void;
        };
        if (!fl.feature || !fl.setTooltipContent) return;
        fl.setTooltipContent(tooltipFor(fl.feature as GeoFeature));
      });
    }

    // Run an initial recolor so styles reflect any data already hydrated at
    // mount; the subscription below handles every subsequent change.
    recolor();

    // Subscribe to the slices that affect fill/tooltips. Returning a tuple of
    // the relevant slices lets Zustand fire `recolor` only when one changes
    // (data hydration: countries/dishes; live logging: userEntries).
    const unsubData = useAppStore.subscribe((state, prev) => {
      if (
        state.userEntries !== prev.userEntries ||
        state.countries !== prev.countries ||
        state.dishes !== prev.dishes
      ) {
        recolor();
      }
    });

    // ── Preview-driven interaction lock ──────────────────────────────
    // Disable drag/zoom while a country preview panel is open (matches the
    // old MapInteractionController behavior).
    function applyInteraction(previewedCountryId: number | null) {
      if (previewedCountryId !== null) {
        map.dragging.disable();
        map.scrollWheelZoom.disable();
        map.touchZoom.disable();
      } else {
        map.dragging.enable();
        map.scrollWheelZoom.enable();
        map.touchZoom.enable();
      }
    }
    applyInteraction(useAppStore.getState().previewedCountryId);
    const unsubPreview = useAppStore.subscribe((state, prev) => {
      if (state.previewedCountryId !== prev.previewedCountryId) {
        applyInteraction(state.previewedCountryId);
      }
    });

    // ── Labels at higher zoom ────────────────────────────────────────
    // Show Carto's label-only tiles (in the no-pointer `labels` pane) only at
    // zoom ≥ 4; add/remove the layer on zoomend.
    function updateLabels() {
      const showLabels = map.getZoom() >= 4;
      if (showLabels && !labelsLayerRef.current) {
        const labels = L.tileLayer(
          "https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png",
          { pane: "labels" },
        );
        labels.addTo(map);
        labelsLayerRef.current = labels;
      } else if (!showLabels && labelsLayerRef.current) {
        map.removeLayer(labelsLayerRef.current);
        labelsLayerRef.current = null;
      }
    }
    updateLabels();
    map.on("zoomend", updateLabels);

    // ── Resize handling ──────────────────────────────────────────────
    // The map is kept mounted but hidden (display:none -> 0×0) when off the
    // map route. When it regains size we invalidateSize so it repaints with
    // no stale/blank tiles.
    const resizeObserver = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (box && box.width > 0 && box.height > 0) {
        map.invalidateSize();
      }
    });
    resizeObserver.observe(el);

    // ── Cleanup ──────────────────────────────────────────────────────
    return () => {
      resizeObserver.disconnect();
      unsubData();
      unsubPreview();
      map.off("zoomend", updateLabels);
      map.remove();
      mapRef.current = null;
      geoJsonRef.current = null;
      labelsLayerRef.current = null;
    };
    // Mount-only: the map is created once and never recreated.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Render ──────────────────────────────────────────────────────────
  // A single container holding the map div. The component never re-renders
  // in response to store changes (no `useAppStore(selector)` above), so React
  // leaves this DOM untouched after mount.
  return (
    <div className="relative flex h-full flex-1 flex-col min-h-0">
      <div
        ref={mapDivRef}
        className="z-0 flex-1"
        style={{ background: "#a3c4d6", height: "100%" }}
      />
    </div>
  );
}
