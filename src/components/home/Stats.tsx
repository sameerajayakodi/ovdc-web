"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./home.module.css";

type Stat = { to: number; suffix: string; label: string };

/** Count-up numbers once the band scrolls into view. */
export function Stats({ stats }: { stats: Stat[] }) {
  const ref = useRef<HTMLElement>(null);
  const [t, setT] = useState(1);

  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let done = false;
    const run = () => {
      if (done) return;
      done = true;
      io.disconnect();
      const t0 = performance.now();
      const step = (now: number) => {
        const k = Math.min(1, (now - t0) / 1800);
        setT(1 - Math.pow(1 - k, 3));
        if (k < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };
    const io = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && run(), { threshold: 0.3 });
    // Only animate when the band starts below the fold; otherwise keep the final values.
    if (el.getBoundingClientRect().top > window.innerHeight) {
      raf = requestAnimationFrame(() => setT(0));
      io.observe(el);
    }
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section ref={ref} aria-label="OVDC in numbers" className={styles.stats}>
      {stats.map((s) => (
        <div key={s.label} className={styles.stat}>
          <span className={`${styles.statValue} nums`}>
            {Math.round(s.to * t).toLocaleString("en-US")}
            <span style={{ color: "var(--color-gold-display)" }}>{s.suffix}</span>
          </span>
          <span className={styles.statLabel}>{s.label}</span>
        </div>
      ))}
    </section>
  );
}
