"use client";

import { useSearchParams } from "next/navigation";
import type { Tour } from "@/lib/types";
import { TourViewer } from "./TourViewer";

/** Full-screen tour page; "Close" returns to the page that opened it (same-site paths only). */
export function TourScreen({ tour }: { tour: Tour }) {
  const from = useSearchParams().get("from");
  const backHref = from && from.startsWith("/") && !from.startsWith("//") ? from : undefined;
  return <TourViewer tour={tour} backHref={backHref} />;
}
