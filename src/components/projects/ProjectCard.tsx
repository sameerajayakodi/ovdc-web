import Link from "next/link";
import type { Project } from "@/lib/types";
import { routes } from "@/lib/routes";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { photos, projectPhoto } from "@/lib/data/media";
import { ProjectBadge, TourBadge } from "@/components/ui/Status";
import { Price, PriceLkr } from "@/components/ui/Price";
import styles from "./ProjectCard.module.css";

/** Portfolio card used on Home and the Projects listing. `detailed` adds blurb + facts. */
export function ProjectCard({ p, detailed, headingLevel = 3 }: { p: Project; detailed?: boolean; headingLevel?: 2 | 3 }) {
  const H = headingLevel === 2 ? "h2" : "h3";
  const href = routes.project(p.slug);
  const completionShort = p.completion.replace("Handed over ", "").replace("Launching ", "Launch ");

  return (
    <article className={styles.card} data-reveal>
      <Link href={href} className={`zoom ${styles.media}`} aria-label={p.name}>
        <ImageSlot photo={photos[projectPhoto[p.slug] ?? "towerBeach"]} alt={`${p.name}, ${p.loc}`} sizes="(max-width: 760px) 100vw, 33vw" />
        <div className={styles.badges}>
          <ProjectBadge status={p.status} />
          {p.tour && <TourBadge />}
        </div>
      </Link>
      <div className={styles.meta}>
        <span className={styles.loc}>{p.loc}</span>
        <span className={styles.type}>
          {p.type} · {p.beds}
        </span>
      </div>
      <H className={styles.name}>
        <Link href={href}>{p.name}</Link>
      </H>
      {detailed && <p className={styles.blurb}>{p.blurb}</p>}
      {detailed && (
        <div className={`${styles.facts} nums`}>
          <div>
            <span>Units</span>
            <span>{p.units}</span>
          </div>
          <div>
            <span>Available</span>
            <span>{p.available}</span>
          </div>
          <div>
            <span>Completion</span>
            <span>{completionShort}</span>
          </div>
        </div>
      )}
      <div className={`${styles.foot} ${detailed ? "" : styles.footRule}`}>
        <span className={styles.price}>
          <span className={styles.priceLabel}>{p.from ? "Price from" : "Status"}</span>
          <span className={`${styles.priceValue} nums`}>
            {p.from ? <Price mn={p.from} /> : p.status === "done" ? "Sold out" : "Register interest"}
          </span>
          {p.from ? <PriceLkr mn={p.from} className={styles.priceLabel} /> : !detailed && <span className={styles.priceLabel}>{p.completion}</span>}
        </span>
        <Link href={href} className={styles.view}>
          {detailed ? "View project →" : "View →"}
        </Link>
      </div>
    </article>
  );
}
