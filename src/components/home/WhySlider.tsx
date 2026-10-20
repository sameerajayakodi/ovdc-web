"use client";

import { useState } from "react";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { photos, type PhotoKey } from "@/lib/data/media";
import styles from "./home.module.css";

const WHY_PHOTO: Record<string, PhotoKey> = { excellence: "kitchen", trust: "keys", innovation: "solar" };

type Why = { id: string; title: string; ph: string; body: string; points: { v: string; l: string }[] };

export function WhySlider({ items }: { items: Why[] }) {
  const [i, setI] = useState(0);
  const w = items[i];
  const n = items.length;

  return (
    <section className={`section on-navy ${styles.stack}`} data-reveal aria-roledescription="carousel" aria-label="Why OVDC">
      <div className={styles.whyHead}>
        <div className={styles.headText}>
          <span className="kicker">03 · Why OVDC</span>
          <h2 className="h-section">Why choose us</h2>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <span aria-live="polite" style={{ fontFamily: "var(--font-heading)", fontSize: 32 }} className="nums">
            <span style={{ color: "var(--color-gold)" }}>0{i + 1}</span> / 0{n}
          </span>
          <div className={styles.arrows}>
            <button aria-label="Previous reason" onClick={() => setI((i + n - 1) % n)}>
              ←
            </button>
            <button aria-label="Next reason" onClick={() => setI((i + 1) % n)}>
              →
            </button>
          </div>
        </div>
      </div>
      <div className={styles.whyGrid}>
        <div key={w.id} className={styles.whyText}>
          <span className={styles.whyTitle}>{w.title}</span>
          <p style={{ maxWidth: "44ch", fontSize: 17, lineHeight: 1.65, color: "var(--color-on-navy-muted)" }}>{w.body}</p>
          <div className={styles.whyPoints}>
            {w.points.map((pt) => (
              <div key={pt.l}>
                <span>{pt.v}</span>
                <span>{pt.l}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${n},1fr)`, gap: 6 }}>
            {items.map((x, k) => (
              <button key={x.id} aria-label={`Show ${x.title}`} aria-pressed={k === i} onClick={() => setI(k)} className={styles.whyBar}>
                <span style={{ background: k === i ? "var(--color-gold)" : "var(--color-rule-dark)" }} />
              </button>
            ))}
          </div>
        </div>
        <div className="zoom" style={{ position: "relative", minHeight: "clamp(320px, 34vw, 520px)" }}>
          <ImageSlot key={w.id} tone="dark" photo={photos[WHY_PHOTO[w.id] ?? "marble"]} sizes="(max-width: 760px) 100vw, 50vw" />
        </div>
      </div>
    </section>
  );
}
