import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap, useMapEvents } from "react-leaflet";
import type { GeoJSON as LeafletGeoJSON, Layer, LeafletMouseEvent } from "leaflet";
import L from "leaflet";
import { useAppStore } from "../stores/appStore";
import geoData from "../data/countries.geo.json";

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

// ── Labels overlay at higher zoom ───────────────────────────────────

function LabelsOverlay() {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());

  useMapEvents({
    zoomend: () => setZoom(map.getZoom()),
  });

  useEffect(() => {
    if (!map.getPane("labels")) {
      const pane = map.createPane("labels");
      pane.style.zIndex = "650";
      pane.style.pointerEvents = "none";
    }
  }, [map]);

  if (zoom < 4) return null;

  return (
    <TileLayer
      url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png"
      pane="labels"
    />
  );
}

// ── Map interaction controller ──────────────────────────────────────

function MapInteractionController() {
  const map = useMap();
  const previewedCountryId = useAppStore((s) => s.previewedCountryId);

  useEffect(() => {
    if (previewedCountryId !== null) {
      map.dragging.disable();
      map.scrollWheelZoom.disable();
      map.touchZoom.disable();
    } else {
      map.dragging.enable();
      map.scrollWheelZoom.enable();
      map.touchZoom.enable();
    }
  }, [map, previewedCountryId]);

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

// ── Component ───────────────────────────────────────────────────────

export default function WorldMap() {
  const countries = useAppStore((s) => s.countries);
  const dishes = useAppStore((s) => s.dishes);
  const getCountryProgress = useAppStore((s) => s.getCountryProgress);
  const userEntries = useAppStore((s) => s.userEntries);
  const previewCountry = useAppStore((s) => s.previewCountry);

  const geoJsonRef = useRef<LeafletGeoJSON | null>(null);

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
    // Force canvas redraw
    layer.eachLayer((child) => {
      if (typeof (child as any).redraw === "function") {
        (child as any).redraw();
      }
    });
  }, [userEntries, style, resolveCountry, progressByCountryId]);

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className="relative flex h-full flex-1 flex-col min-h-0">
      <MapContainer
        center={[20, 0]}
        zoom={2}
        minZoom={2}
        maxZoom={6}
        zoomControl={true}
        scrollWheelZoom={true}
        preferCanvas={true}
        className="z-0 flex-1"
        style={{ background: "#f5ebe0", height: "100%" }}
      >
        <MapResizer />
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
        />
        <GeoJSON
          ref={geoJsonRef}
          data={geoData as unknown as GeoJSON.GeoJsonObject}
          style={style}
          onEachFeature={onEachFeature}
        />
        <LabelsOverlay />
        <MapInteractionController />
      </MapContainer>
    </div>
  );
}
