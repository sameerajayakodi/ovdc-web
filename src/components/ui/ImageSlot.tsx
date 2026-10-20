import Image from "next/image";
import type { Photo } from "@/lib/data/media";
import styles from "./ImageSlot.module.css";

/**
 * Photograph frame. Shows the real image when `src` is set; until OVDC supplies
 * photography it renders the design's labelled placeholder so it is obvious
 * which shot belongs where.
 */
export function ImageSlot({
  photo,
  src: srcProp,
  alt: altProp,
  label,
  tone = "light",
  fit = "cover",
  priority,
  sizes = "(max-width: 760px) 100vw, 50vw",
  className,
  round,
}: {
  src?: string;
  alt?: string;
  label?: string;
  tone?: "light" | "dark";
  fit?: "cover" | "contain";
  priority?: boolean;
  sizes?: string;
  className?: string;
  round?: boolean;
  /** A registered photo (src + alt) from src/lib/data/media.ts */
  photo?: Photo;
}) {
  const src = srcProp ?? photo?.src;
  const alt = altProp ?? photo?.alt ?? "";
  const cls = [styles.slot, tone === "dark" ? styles.dark : "", round ? styles.round : "", className ?? ""].join(" ");
  if (src) {
    return (
      <div className={cls}>
        <Image src={src} alt={alt} fill sizes={sizes} priority={priority} style={{ objectFit: fit }} className="slot-inner" />
      </div>
    );
  }
  return (
    <div className={cls} role={alt ? "img" : undefined} aria-label={alt || undefined}>
      <div className={`${styles.placeholder} slot-inner`}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <rect x="3" y="3" width="18" height="18" />
          <circle cx="9" cy="9" r="2" />
          <path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" />
        </svg>
        {label && <span>{label}</span>}
      </div>
    </div>
  );
}
