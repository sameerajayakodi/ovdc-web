"use client";

import { LeafletMap } from "@/components/ui/LeafletMap";
import type { NearbyPlace } from "@/lib/types";

export function ProjectMap({ name, lat, lng, nearby }: { name: string; lat: number; lng: number; nearby: NearbyPlace[] }) {
  const pins = [
    { lat, lng, label: name, active: true },
    ...nearby.filter((n) => n.min < 40).map((n) => ({ kind: "dot" as const, lat: n.lat, lng: n.lng, title: n.name })),
  ];
  return <LeafletMap center={[lat, lng]} zoom={14} pins={pins} fit={pins.length > 1} ariaLabel={`Map of ${name} and nearby places`} />;
}
