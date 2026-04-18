import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import type { GeoJSON as LeafletGeoJSON, Layer, LeafletMouseEvent } from "leaflet";
import L from "leaflet";
import { useAppStore } from "../stores/appStore";

// ── Types for GeoJSON data ──────────────────────────────────────────

interface GeoFeature {
  type: "Feature";
  properties: {
    ADMIN?: string;
    ISO_A2?: string;
    ISO_A3?: string;
    name?: string;
    [key: string]: unknown;
  };
  geometry: GeoJSON.Geometry;
}

interface GeoCollection {
  type: "FeatureCollection";
  features: GeoFeature[];
}

// ── Resize helper ───────────────────────────────────────────────────

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
}

// ── Country color helper ────────────────────────────────────────────

// Returns fill color based on tried percentage and whether the country
// has any want-to-try dishes but no tried dishes yet.
function progressColor(percentage: number, hasWantToTry: boolean): string {
  if (percentage >= 100) return "#16a34a"; // green-600 -- complete (100%)
  if (percentage > 0) return "#d97706";   // amber-600 -- started (>0%)
  if (hasWantToTry) return "#fde68a";      // amber-200 -- want-to-try but untried
  return "#fff";                            // untouched
}

// ── GeoJSON URL ─────────────────────────────────────────────────────

const GEOJSON_URL =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson";

// ── Component ───────────────────────────────────────────────────────

export default function WorldMap() {
  const countries = useAppStore((s) => s.countries);
  const dishes = useAppStore((s) => s.dishes);
  const getCountryProgress = useAppStore((s) => s.getCountryProgress);
  const userEntries = useAppStore((s) => s.userEntries);
  const previewCountry = useAppStore((s) => s.previewCountry);

  const geoJsonRef = useRef<LeafletGeoJSON | null>(null);

  const [geoData, setGeoData] = useState<GeoCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Build a lookup: ISO alpha-2 code -> country record
  const codeToCountry = useMemo(() => {
    const map = new Map<string, (typeof countries)[0]>();
    for (const c of countries) {
      map.set(c.code.toUpperCase(), c);
    }
    return map;
  }, [countries]);

  // Pre-compute progress for all countries (avoids ~400 array scans per render)
  const progressByCountryId = useMemo(() => {
    const map = new Map<number, ReturnType<typeof getCountryProgress>>();
    for (const c of countries) {
      map.set(c.id, getCountryProgress(c.id));
    }
    return map;
  }, [countries, getCountryProgress, userEntries]);

  // Pre-compute which country IDs have at least one want-to-try dish
  const wantToTryCountryIds = useMemo(() => {
    const set = new Set<number>();
    for (const [dishId, entry] of userEntries) {
      if (entry.status === "want-to-try") {
        const dish = dishes.find((d) => d.id === dishId);
        if (dish) set.add(dish.countryId);
      }
    }
    return set;
  }, [userEntries, dishes]);

  // Fetch GeoJSON data
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(GEOJSON_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: GeoCollection = await res.json();
        if (!cancelled) {
          setGeoData(data);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "Failed to load map data",
          );
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Resolve a GeoJSON feature -> our Country record (if any)
  const resolveCountry = useCallback(
    (feature: GeoFeature) => {
      const iso = feature.properties.ISO_A2 ?? "";
      return codeToCountry.get(iso.toUpperCase());
    },
    [codeToCountry],
  );

  // Style callback for each country polygon
  const style = useCallback(
    (feature?: GeoJSON.Feature) => {
      if (!feature) return {};
      const country = resolveCountry(feature as GeoFeature);
      const prog = country ? progressByCountryId.get(country.id) ?? null : null;
      const hasWantToTry = country ? wantToTryCountryIds.has(country.id) : false;
      const fill = progressColor(prog ? prog.percentage : 0, hasWantToTry);
      const isUntouched = !country || (!prog?.tried && !hasWantToTry);
      return {
        fillColor: fill,
        fillOpacity: country ? 0.75 : 0.2,
        color: isUntouched ? "#9ca3af" : "#fff",
        weight: 1,
        opacity: 0.6,
      };
    },
    [resolveCountry, progressByCountryId, wantToTryCountryIds],
  );

  // Interaction callbacks per feature
  const onEachFeature = useCallback(
    (feature: GeoJSON.Feature, layer: Layer) => {
      const geo = feature as GeoFeature;
      const country = resolveCountry(geo);
      const name =
        country?.name ?? geo.properties.ADMIN ?? geo.properties.name ?? "Unknown";
      const prog = country ? progressByCountryId.get(country.id) ?? null : null;

      // Tooltip
      const tip =
        prog
          ? `<strong>${name}</strong><br/>${prog.percentage}% explored`
          : `<strong>${name}</strong>`;
      layer.bindTooltip(tip, { sticky: true, direction: "top", offset: [0, -8] });

      // Hover highlight
      layer.on({
        mouseover: (e: LeafletMouseEvent) => {
          const target = e.target as L.Path;
          target.setStyle({
            fillOpacity: 0.9,
            weight: 2,
          });
          target.bringToFront();
        },
        mouseout: (e: LeafletMouseEvent) => {
          const target = e.target as L.Path;
          const c = resolveCountry(geo);
          target.setStyle({
            fillOpacity: c ? 0.75 : 0.2,
            weight: 1,
          });
        },
        click: () => {
          if (country) {
            previewCountry(country.id);
          }
        },
      });
    },
    [resolveCountry, progressByCountryId, previewCountry],
  );

  // When userEntries changes, re-apply styles and tooltip content to
  // each feature layer in-place via the GeoJSON ref. This is the
  // idiomatic react-leaflet pattern: avoid remounting <GeoJSON>
  // (which drops hover state and flickers), and instead reach into
  // the underlying Leaflet layer to mutate it. Zustand selectors like
  // getCountryProgress have stable identities, so react-leaflet alone
  // can't know the style function's output has changed — this effect
  // bridges that gap.
  useEffect(() => {
    const layer = geoJsonRef.current;
    if (!layer) return;
    layer.setStyle(style);
    layer.eachLayer((child) => {
      const featureLayer = child as Layer & {
        feature?: GeoJSON.Feature;
      };
      const feature = featureLayer.feature;
      if (!feature) return;
      const country = resolveCountry(feature as GeoFeature);
      const name =
        country?.name ??
        (feature as GeoFeature).properties.ADMIN ??
        (feature as GeoFeature).properties.name ??
        "Unknown";
      const prog = country ? progressByCountryId.get(country.id) ?? null : null;
      const tip = prog
        ? `<strong>${name}</strong><br/>${prog.percentage}% explored`
        : `<strong>${name}</strong>`;
      (
        featureLayer as unknown as { setTooltipContent: (c: string) => void }
      ).setTooltipContent(tip);
    });
  }, [userEntries, style, resolveCountry, progressByCountryId]);

  // ── Render ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-200 border-t-amber-500" />
          <p className="text-sm font-medium text-amber-700">
            Loading world map...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-4 text-center">
          <p className="font-semibold text-red-700">
            Could not load map data
          </p>
          <p className="mt-1 text-sm text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-1 flex-col">
      <MapContainer
        center={[20, 0]}
        zoom={2}
        minZoom={2}
        maxZoom={6}
        zoomControl={true}
        scrollWheelZoom={true}
        className="z-0 flex-1"
        style={{ background: "#f5ebe0" }}
      >
        <MapResizer />
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
        />
        {geoData && (
          <GeoJSON
            ref={geoJsonRef}
            data={geoData as GeoJSON.GeoJsonObject}
            style={style}
            onEachFeature={onEachFeature}
          />
        )}
      </MapContainer>
    </div>
  );
}
