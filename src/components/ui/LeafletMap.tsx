"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type * as L from "leaflet";

export interface MapPin {
  id?: string;
  lat: number;
  lng: number;
  label?: string;
  title?: string;
  /** "label" draws a price/name flag; "dot" a small marker */
  kind?: "label" | "dot";
  active?: boolean;
  color?: string;
}

function pinHtml(p: MapPin) {
  if (p.kind === "dot") {
    return `<div style="width:14px;height:14px;border-radius:50%;background:${p.color || "#0f1b2d"};border:2px solid #f6f3ed;box-shadow:0 2px 6px rgba(0,0,0,.3);transform:translate(-50%,-50%)"></div>`;
  }
  const bg = p.active ? "#c4a05a" : "#0f1b2d";
  const fg = p.active ? "#0f1b2d" : "#f3eee4";
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
  return `<div style="display:inline-flex;align-items:center;gap:6px;white-space:nowrap;padding:6px 10px;font:600 12px Archivo,system-ui,sans-serif;letter-spacing:.02em;background:${bg};color:${fg};box-shadow:0 6px 16px rgba(15,27,45,.3);transform:translate(-50%,calc(-100% - 6px));position:relative">${esc(p.label ?? "")}<span style="position:absolute;left:50%;bottom:-5px;width:10px;height:10px;margin-left:-5px;background:${bg};transform:rotate(45deg)"></span></div>`;
}

/**
 * Tile source. OpenStreetMap's public tiles are fine for development; set
 * NEXT_PUBLIC_MAP_TILES (+ NEXT_PUBLIC_MAP_ATTRIBUTION) to a keyed provider
 * such as MapTiler or Stadia before launch.
 */
const TILES = process.env.NEXT_PUBLIC_MAP_TILES || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION = process.env.NEXT_PUBLIC_MAP_ATTRIBUTION || "© OpenStreetMap contributors";

/** Leaflet map with OVDC pins, tiles toned to the brand. Leaflet loads on the client only. */
export function LeafletMap({
  center,
  zoom = 13,
  pins,
  fit = true,
  dark,
  onPinClick,
  className,
  ariaLabel = "Map",
}: {
  center: [number, number];
  zoom?: number;
  pins: MapPin[];
  fit?: boolean;
  dark?: boolean;
  onPinClick?: (id: string) => void;
  className?: string;
  ariaLabel?: string;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const lib = useRef<typeof L | null>(null);
  const clickRef = useRef(onPinClick);
  const fittedFor = useRef("");

  useEffect(() => {
    clickRef.current = onPinClick;
  }, [onPinClick]);

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const Lmod = (await import("leaflet")).default;
      if (cancelled || !el.current || map.current) return;
      lib.current = Lmod;
      const m = Lmod.map(el.current, { zoomControl: false, scrollWheelZoom: false, attributionControl: true }).setView(center, zoom);
      Lmod.tileLayer(TILES, { attribution: ATTRIBUTION, maxZoom: 19, className: dark ? "ovdc-tiles-dark" : "ovdc-tiles" }).addTo(m);
      Lmod.control.zoom({ position: "bottomright" }).addTo(m);
      layer.current = Lmod.layerGroup().addTo(m);
      map.current = m;
      setTimeout(() => m.invalidateSize(), 150);
      draw();
    })();
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function draw() {
    const Lmod = lib.current;
    const m = map.current;
    if (!Lmod || !m || !layer.current) return;
    layer.current.clearLayers();
    pins.forEach((p) => {
      const mk = Lmod.marker([p.lat, p.lng], {
        icon: Lmod.divIcon({ html: pinHtml(p), className: "", iconSize: [0, 0] }),
        title: p.title || p.label,
        keyboard: true,
      }).addTo(layer.current!);
      if (p.id) mk.on("click", () => clickRef.current?.(p.id!));
    });
    const key = pins.map((p) => `${p.lat},${p.lng}`).join("|");
    if (fit && pins.length > 1 && key !== fittedFor.current) {
      fittedFor.current = key;
      m.fitBounds(Lmod.latLngBounds(pins.map((p) => [p.lat, p.lng] as [number, number])), { padding: [50, 50] });
    }
  }

  // Redraw pins whenever they change.
  useEffect(draw);

  return <div ref={el} className={className} role="region" aria-label={ariaLabel} style={{ position: "absolute", inset: 0, background: "var(--color-surface)" }} />;
}
