import type { Photo } from "@/lib/data/media";
import { ImageSlot } from "./ImageSlot";
import { Breadcrumbs, type Crumb } from "./Breadcrumbs";
import s from "./PageHero.module.css";

/** Page header: plain (light) or over a photograph (navy scrim). */
export function PageHero({
  crumb,
  crumbs,
  kicker,
  title,
  lead,
  photo,
  children,
}: {
  /** Current page label (single-level trail) */
  crumb: string;
  /** Full trail below Home; overrides `crumb` */
  crumbs?: Crumb[];
  kicker?: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  photo?: Photo;
  children?: React.ReactNode;
}) {
  if (photo) {
    return (
      <header className={s.photo}>
        <ImageSlot photo={photo} priority sizes="100vw" tone="dark" />
        <div className={s.scrim} />
        <div className={s.photoCopy}>
          <Breadcrumbs tone="dark" items={crumbs ?? [{ label: crumb }]} />
          {kicker && <span className="kicker kicker-on-navy">{kicker}</span>}
          <h1 className={s.title}>{title}</h1>
          {lead && <p className={s.lead}>{lead}</p>}
          {children}
        </div>
      </header>
    );
  }
  return (
    <header className={`wrap ${s.plain}`}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Breadcrumbs items={crumbs ?? [{ label: crumb }]} />
        {kicker && <span className="kicker">{kicker}</span>}
        <h1 className="h-page">{title}</h1>
      </div>
      {lead && <p className="muted" style={{ maxWidth: "52ch", fontSize: 15, lineHeight: 1.6 }}>{lead}</p>}
      {children}
    </header>
  );
}
