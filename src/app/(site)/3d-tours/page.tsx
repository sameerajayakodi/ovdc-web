import type { Metadata } from "next";
import Link from "next/link";
import { getProjects, getTours } from "@/lib/api";
import { photos, projectPhoto, typePhoto } from "@/lib/data/media";
import { routes } from "@/lib/routes";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { Icon360, IconCube } from "@/components/ui/Icons";
import { PageHero } from "@/components/ui/PageHero";
import { Price } from "@/components/ui/Price";
import c from "@/components/content/content.module.css";

export const metadata: Metadata = {
  title: "3D & 360° virtual tours",
  description: "Walk through OVDC residences in 360°, pick a floor in the live building explorer, or book a guided video tour from anywhere in the world.",
};

export default async function ToursHubPage() {
  const [tours, projects] = await Promise.all([getTours(), getProjects()]);
  const explorers = projects.filter((p) => p.explorer);
  const comingSoon = projects.filter((p) => !p.tour && p.status !== "done");

  return (
    <>
      <PageHero
        crumb="3D & 360°"
        kicker="Explore from anywhere"
        title={
          <>
            Walk through your home <em>before it’s built.</em>
          </>
        }
        lead="Every new OVDC launch comes with a 360° tour of the show apartment and a live building explorer, so buyers in Colombo, Dubai, Melbourne and London can choose with the same confidence."
        photo={photos.towerDusk}
      >
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link className="btn btn-primary btn-lg" href={routes.tour(tours[0].id, routes.tours)}>
            Start the 360° tour
            <Icon360 size={16} stroke="currentColor" />
          </Link>
          <Link className="btn btn-secondary on-dark btn-lg" href={routes.explorer(explorers[0].slug)}>
            Open building explorer<span aria-hidden>→</span>
          </Link>
        </div>
      </PageHero>

      <section className={c.section}>
        <div className={c.sectionHead}>
          <div className={c.headText}>
            <span className="kicker">360° tours</span>
            <h2 className="h-section">Show apartments, room by room</h2>
          </div>
          <p className="lead" style={{ maxWidth: "46ch" }}>
            Drag to look around, tap the gold markers to move between rooms, and switch to VR with a phone headset.
          </p>
        </div>
        <div className={c.cards}>
          {tours.map((t) => (
            <Link key={t.id} href={routes.tour(t.id, routes.tours)} className={c.card}>
              <span className={`zoom ${c.media}`}>
                <ImageSlot photo={photos[typePhoto[t.typeLabel] ?? "livingSea"]} sizes="(max-width: 760px) 100vw, 33vw" />
                <span className="badge badge-glass" style={{ position: "absolute", left: 12, top: 12 }}>
                  <Icon360 />
                  {t.scenes.length} rooms
                </span>
              </span>
              <span className="kicker">
                {t.projectName} · {t.typeLabel}
              </span>
              <h3 className={c.cardTitle}>{t.title}</h3>
              <span className="muted" style={{ fontSize: 14 }}>
                {t.scenes.map((x) => x.name).join(" · ")}
              </span>
              <span className="nums" style={{ fontWeight: 600 }}>
                from <Price mn={t.price} />
              </span>
            </Link>
          ))}
          {comingSoon.map((p) => (
            <div key={p.id} className={c.card} aria-disabled>
              <span className={c.media}>
                <ImageSlot photo={photos[projectPhoto[p.slug] ?? "towerBeach"]} sizes="(max-width: 760px) 100vw, 33vw" />
                <span style={{ position: "absolute", inset: 0, background: "rgba(15,27,45,.55)" }} />
                <span className="badge" style={{ position: "absolute", left: 12, top: 12, background: "var(--color-cream)", color: "var(--color-navy)" }}>
                  Tour coming soon
                </span>
              </span>
              <span className="kicker">{p.loc}</span>
              <h3 className={c.cardTitle}>{p.name}</h3>
              <Link href={routes.project(p.slug)} className="btn btn-ghost" style={{ alignSelf: "flex-start" }}>
                Register for the launch tour
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className={`${c.section} ${c.navyBand}`}>
        <div className={c.split}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <span className="kicker">Building explorer</span>
            <h2 className="h-section">See live availability, floor by floor</h2>
            <p className="lead">
              Hover over the tower to see how many homes are left on each floor, open a floor plate, then go straight to a unit’s
              price, plan and 360° tour. Availability updates the moment our sales team reserves a unit.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {explorers.map((p) => (
                <Link key={p.id} className="btn btn-primary" href={routes.explorer(p.slug)}>
                  {p.name}
                  <IconCube />
                </Link>
              ))}
            </div>
          </div>
          <Link href={routes.explorer(explorers[0].slug)} className="zoom" style={{ position: "relative", aspectRatio: "4/3", display: "block" }}>
            <ImageSlot photo={photos.colomboDusk} tone="dark" sizes="(max-width: 760px) 100vw, 50vw" />
          </Link>
        </div>
      </section>

      <section className={c.section}>
        <div className={c.headText}>
          <span className="kicker">How to get the most from a tour</span>
          <h2 className="h-section">Three ways to look around</h2>
        </div>
        <ol className={c.steps}>
          <li>
            <h3>On a laptop</h3>
            <p>Drag to look around, scroll to zoom and click the gold markers to move between rooms. The floor plan shows where you are.</p>
          </li>
          <li>
            <h3>On your phone</h3>
            <p>Tap the phone icon to use the gyroscope: move your phone to look around the room as if you were standing in it.</p>
          </li>
          <li>
            <h3>In a VR headset</h3>
            <p>Tap VR to split the screen and place your phone in any cardboard-style headset for a fully immersive walk-through.</p>
          </li>
          <li>
            <h3>With a sales advisor</h3>
            <p>Book a live video tour: an advisor walks the show apartment with you and answers questions in real time, in your time zone.</p>
          </li>
        </ol>
      </section>

      <section className={c.cta}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <span className="kicker">Overseas?</span>
          <h2 style={{ fontSize: "clamp(32px, 3.6vw, 48px)", lineHeight: 1 }}>Book a live video walk-through</h2>
        </div>
        <div className={c.ctaActions}>
          <Link className="btn btn-primary btn-lg" href={routes.bookVisit() + "?visit=video"}>
            Book a video tour<span aria-hidden>→</span>
          </Link>
          <Link className="btn btn-secondary on-dark btn-lg" href={routes.overseas}>
            Buying from abroad
          </Link>
        </div>
      </section>
    </>
  );
}
