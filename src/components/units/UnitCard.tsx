import Link from "next/link";
import type { Unit } from "@/lib/types";
import { routes } from "@/lib/routes";
import { unitRef } from "@/lib/unitRef";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { photos, typePhoto } from "@/lib/data/media";
import { UnitStatusTag } from "@/components/ui/Status";
import { Icon360 } from "@/components/ui/Icons";
import { Price, PriceLkr } from "@/components/ui/Price";
import styles from "./UnitCard.module.css";

export function UnitCard({
  unit,
  projectSlug,
  projectShort,
  tourId,
}: {
  unit: Unit;
  projectSlug: string;
  projectShort: string;
  tourId?: string | null;
}) {
  const ref = unitRef(unit);
  const href = routes.unit(projectSlug, ref);
  const title = `${unit.label}, ${unit.view.toLowerCase()} view`;

  return (
    <article className={styles.card}>
      <div className={`zoom ${styles.media}`}>
        <ImageSlot photo={photos[unit.view === "City" ? "living" : (typePhoto[unit.type] ?? "living")]} alt={`${unit.type} interior, ${title}`} sizes="(max-width: 760px) 100vw, 25vw" />
        {tourId && (
          <Link href={routes.tour(tourId, href)} className={`badge badge-glass ${styles.tour}`}>
            <Icon360 />
            360°
          </Link>
        )}
      </div>
      <div className={styles.body}>
        <div className={styles.top}>
          <span className={`${styles.ref} nums`}>
            {projectShort} · {ref}
          </span>
          <UnitStatusTag status={unit.status} />
        </div>
        <h3 className={styles.title}>
          <Link href={href}>{title.charAt(0).toUpperCase() + title.slice(1)}</Link>
        </h3>
        <div className={`${styles.specs} nums`}>
          <div>
            <span>Beds</span>
            <span>{unit.beds}</span>
          </div>
          <div>
            <span>Baths</span>
            <span>{unit.baths}</span>
          </div>
          <div>
            <span>sqft</span>
            <span>{unit.sqft.toLocaleString("en-US")}</span>
          </div>
          <div>
            <span>Floor</span>
            <span>{unit.floor}</span>
          </div>
        </div>
        <div className={styles.foot}>
          <span style={{ display: "flex", flexDirection: "column" }}>
            <span className="nums" style={{ fontSize: 18, fontWeight: 600, textDecoration: unit.status === "S" ? "line-through" : "none" }}>
              <Price mn={unit.price} />
            </span>
            <PriceLkr mn={unit.price} className={styles.sub} />
          </span>
          <Link href={href} className={styles.more}>
            Details →
          </Link>
        </div>
      </div>
    </article>
  );
}
