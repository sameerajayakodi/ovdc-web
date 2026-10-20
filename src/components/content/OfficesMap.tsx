"use client";

import { LeafletMap } from "@/components/ui/LeafletMap";

export function OfficesMap({ offices }: { offices: { city: string; label: string; lat: number; lng: number }[] }) {
  return (
    <LeafletMap
      center={[offices[0].lat, offices[0].lng]}
      zoom={12}
      ariaLabel="Map of OVDC offices"
      pins={offices.map((o, i) => ({ lat: o.lat, lng: o.lng, label: o.city, title: o.label, active: i === 0 }))}
    />
  );
}
