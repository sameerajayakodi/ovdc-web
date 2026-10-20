import Link from "next/link";
import type { Tour } from "@/lib/types";
import { routes } from "@/lib/routes";
import { embedSrc } from "@/lib/embed";
import s from "./tour.module.css";

/** Full-screen Matterport / Kuula tour with OVDC's own close and enquiry buttons. */
export function EmbedTour({ tour, backHref }: { tour: Tour; backHref?: string }) {
  const src = embedSrc(tour.embedUrl ?? "");
  const back = backHref ?? routes.project(tour.projectSlug);
  return (
    <div className={s.embedWrap}>
      {src ? (
        <iframe className={s.embedFrame} src={src} title={`${tour.title}, 360° tour`} allow="fullscreen; xr-spatial-tracking; gyroscope; accelerometer" allowFullScreen />
      ) : (
        <p className={s.embedMissing}>This tour is not available right now.</p>
      )}
      <div className={s.embedBar}>
        <Link href={back} className="btn btn-secondary on-dark">
          ← Close tour
        </Link>
        <span className={s.embedTitle}>
          {tour.projectName} · {tour.typeLabel}
        </span>
        <Link href={routes.bookVisit({ project: tour.projectSlug, unit: tour.unitRef })} className="btn btn-primary">
          Book a site visit
        </Link>
      </div>
    </div>
  );
}
