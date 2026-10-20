"use client";

import { useEffect, useRef, useState } from "react";
import s from "./project.module.css";

/** Sticky in-page navigation with scroll-spy. Sections are `<section data-sec="id">`. */
export function SubNav({ items }: { items: [string, string][] }) {
  const [cur, setCur] = useState<string | undefined>(items[0]?.[0]);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && setCur(e.target.getAttribute("data-sec") ?? undefined)),
      { rootMargin: "-30% 0px -60% 0px" },
    );
    document.querySelectorAll("[data-sec]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Keep the active tab visible on narrow screens.
  useEffect(() => {
    navRef.current?.querySelector<HTMLElement>('[aria-current="location"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [cur]);

  return (
    <nav ref={navRef} aria-label="On this page" className={s.subnav}>
      {items.map(([k, label]) => (
        <a
          key={k}
          href={`#${k}`}
          aria-current={cur === k ? "location" : undefined}
          onClick={(e) => {
            const el = document.querySelector(`[data-sec="${k}"]`);
            if (!el) return;
            e.preventDefault();
            setCur(k);
            window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 60, behavior: "smooth" });
            history.replaceState(null, "", `#${k}`);
          }}
        >
          {label}
        </a>
      ))}
    </nav>
  );
}
