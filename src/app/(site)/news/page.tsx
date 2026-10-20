import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "@/lib/data/editorial";
import { photos } from "@/lib/data/media";
import { routes } from "@/lib/routes";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { PageHero } from "@/components/ui/PageHero";
import c from "@/components/content/content.module.css";

export const metadata: Metadata = {
  title: "News & insights",
  description: "Construction updates, buying guides and stories from OVDC developments across Sri Lanka.",
};

const fmt = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

export default function NewsPage() {
  const [lead, ...rest] = [...articles].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <>
      <PageHero crumb="News" title="News & insights" lead="Construction updates every month, buying guides for Sri Lanka and abroad, and stories from our homes." />

      <section className={c.section} style={{ paddingBottom: 0 }}>
        <Link href={routes.article(lead.slug)} className={c.split} style={{ textDecoration: "none", alignItems: "center" }}>
          <span className="zoom" style={{ position: "relative", aspectRatio: "16/10", display: "block" }}>
            <ImageSlot photo={photos[lead.photo]} priority sizes="(max-width: 760px) 100vw, 50vw" />
          </span>
          <span style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <span className="kicker">
              Latest · {lead.category} · {fmt(lead.date)}
            </span>
            <h2 className="h-section">{lead.title}</h2>
            <span className="lead">{lead.dek}</span>
            <span className="btn btn-ghost" style={{ alignSelf: "flex-start" }}>
              Read the update · {lead.minutes} min
            </span>
          </span>
        </Link>
      </section>

      <section className={c.section}>
        <div className={c.cards}>
          {rest.map((a) => (
            <Link key={a.slug} href={routes.article(a.slug)} className={c.card}>
              <span className={`zoom ${c.media}`}>
                <ImageSlot photo={photos[a.photo]} sizes="(max-width: 760px) 100vw, 33vw" />
              </span>
              <span className="kicker">
                {a.category} · {fmt(a.date)}
              </span>
              <h3 className={c.cardTitle}>{a.title}</h3>
              <span className="muted" style={{ fontSize: 14, lineHeight: 1.55 }}>
                {a.dek}
              </span>
              <span className="subtle" style={{ fontSize: 12 }}>
                {a.minutes} min read
              </span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
