"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import type { Tour } from "@/lib/types";
import { routes } from "@/lib/routes";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { photos, projectGallery } from "@/lib/data/media";
import { IconCube, IconPhotos, IconVideo, Icon360 } from "@/components/ui/Icons";
import s from "./project.module.css";

const TourViewer = dynamic(() => import("@/components/tour/TourViewer").then((m) => m.TourViewer), {
  ssr: false,
  loading: () => <div style={{ position: "absolute", inset: 0, background: "#060d18" }} />,
});

type Tab = "photos" | "video" | "tour" | "3d";

export function Gallery({ projectName, slug, tour, explorer }: { projectName: string; slug: string; tour: Tour | null; explorer: boolean }) {
  const [tab, setTab] = useState<Tab>("photos");
  const gallery = projectGallery[slug] ?? projectGallery["ocean-view-residences"];
  const tabs: { k: Tab; label: string; icon: React.ReactNode }[] = [
    { k: "photos", label: "Photos", icon: <IconPhotos /> },
    { k: "video", label: "Videos", icon: <IconVideo /> },
    ...(tour ? [{ k: "tour" as Tab, label: "360° Tour", icon: <Icon360 size={16} stroke="currentColor" /> }] : []),
    ...(explorer ? [{ k: "3d" as Tab, label: "3D Building", icon: <IconCube /> }] : []),
  ];

  return (
    <section aria-label="Gallery" className="wrap">
      <div role="tablist" aria-label="Media" className={`seg ${s.galleryTabs}`}>
        {tabs.map((t) => (
          <button key={t.k} role="tab" aria-selected={tab === t.k} onClick={() => setTab(t.k)} style={{ minHeight: 48 }}>
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === "photos" && (
        <div className={s.photoGrid}>
          {gallery.map((k, i) => (
            <div key={k} className={`zoom ${i ? s.photoSmall : ""}`} style={i ? undefined : { position: "relative", gridRow: "span 2" }}>
              <ImageSlot photo={photos[k]} priority={i === 0} sizes={i ? "(max-width: 760px) 100vw, 20vw" : "(max-width: 760px) 100vw, 50vw"} />
              {i === gallery.length - 1 && (
                <Link href={`${routes.gallery}?project=${slug}`} className={s.allPhotos}>
                  All photos →
                </Link>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "video" && (
        <div className={s.galleryPane} style={{ background: "var(--color-navy-ink)" }}>
          <ImageSlot tone="dark" photo={photos.oceanSunset} />
          <span className={s.playBtn} aria-hidden>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
          <span style={{ position: "absolute", left: 20, bottom: 16, fontSize: 13, color: "var(--color-white)" }}>
            {projectName} drone film · releasing with the next construction update
          </span>
        </div>
      )}

      {tab === "tour" && tour && (
        <div className={s.galleryPane}>
          <TourViewer tour={tour} embedded />
          <Link href={routes.tour(tour.id, routes.project(slug))} className={`btn btn-primary ${s.fullTour}`}>
            Open full tour<span aria-hidden>↗</span>
          </Link>
        </div>
      )}

      {tab === "3d" && (
        <div className={s.galleryPane} style={{ background: "var(--color-navy-ink)", color: "var(--color-on-navy)" }}>
          <ImageSlot tone="dark" photo={photos.towerDusk} />
          <div style={{ position: "absolute", inset: 0, background: "var(--overlay-photo)" }} />
          <div className={s.paneCaption}>
            <span style={{ display: "flex", flexDirection: "column", gap: 6, color: "var(--color-white)" }}>
              <span className="kicker kicker-on-navy" style={{ letterSpacing: ".14em" }}>
                3D building explorer
              </span>
              <span style={{ fontFamily: "var(--font-heading)", fontSize: 36, lineHeight: 1 }}>Pick a floor, see live availability</span>
            </span>
            <Link className="btn btn-primary" href={routes.explorer(slug)}>
              Open explorer<span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
