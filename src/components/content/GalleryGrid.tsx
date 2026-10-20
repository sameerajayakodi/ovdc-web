"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { Photo } from "@/lib/data/media";
import { IconClose } from "@/components/ui/Icons";
import s from "./gallery.module.css";

export type GalleryItem = { project: string; slug: string; photo: Photo; kind: "Exterior" | "Interior" | "Amenities" | "Location" | "Construction" };

export function GalleryGrid({ items, projects }: { items: GalleryItem[]; projects: { slug: string; name: string }[] }) {
  const sp = useSearchParams();
  const [project, setProject] = useState(sp.get("project") ?? "");
  const [kind, setKind] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  const shown = items.filter((i) => (!project || i.slug === project) && (!kind || i.kind === kind));
  const kinds = Array.from(new Set(items.map((i) => i.kind)));

  const step = useCallback((d: number) => setOpen((o) => (o == null ? o : (o + d + shown.length) % shown.length)), [shown.length]);

  useEffect(() => {
    if (open == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, step]);

  const cur = open != null ? shown[open] : null;

  return (
    <>
      <div className={s.filters}>
        <label className="field" style={{ minWidth: 220 }}>
          <span className="label muted">Project</span>
          <select className="input" value={project} onChange={(e) => setProject(e.target.value)}>
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <div role="group" aria-label="Type" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button type="button" className="chip" aria-pressed={!kind} onClick={() => setKind("")}>
            All
          </button>
          {kinds.map((k) => (
            <button key={k} type="button" className="chip" aria-pressed={kind === k} onClick={() => setKind(k)}>
              {k}
            </button>
          ))}
        </div>
        <span className="muted" style={{ marginLeft: "auto", fontSize: 13 }}>
          {shown.length} photos
        </span>
      </div>

      <div className={s.masonry}>
        {shown.map((it, i) => (
          <button key={`${it.slug}-${it.photo.src}-${i}`} type="button" className={`zoom ${s.tile}`} onClick={() => setOpen(i)} aria-label={`Open photo: ${it.photo.alt}`}>
            <Image
              src={it.photo.src}
              alt={it.photo.alt}
              width={800}
              height={Math.round(800 / it.photo.ar)}
              sizes="(max-width: 760px) 50vw, 25vw"
              style={{ width: "100%", height: "auto", display: "block" }}
            />
            <span className={s.caption}>
              {it.project} · {it.kind}
            </span>
          </button>
        ))}
      </div>

      {cur && (
        <div role="dialog" aria-modal="true" aria-label="Photo viewer" className={s.lightbox} onClick={() => setOpen(null)}>
          <button type="button" className={s.close} aria-label="Close" onClick={() => setOpen(null)}>
            <IconClose />
          </button>
          <button
            type="button"
            className={`${s.arrow} ${s.prev}`}
            aria-label="Previous photo"
            onClick={(e) => {
              e.stopPropagation();
              step(-1);
            }}
          >
            ←
          </button>
          <figure className={s.figure} onClick={(e) => e.stopPropagation()}>
            <div className={s.figImg}>
              <Image src={cur.photo.src} alt={cur.photo.alt} fill sizes="90vw" style={{ objectFit: "contain" }} />
            </div>
            <figcaption>
              <span>
                {cur.project} · {cur.kind} — {cur.photo.alt}
              </span>
              <span className="nums">
                {(open ?? 0) + 1} / {shown.length}
                {cur.photo.by ? ` · Photo: ${cur.photo.by} / Unsplash` : ""}
              </span>
            </figcaption>
          </figure>
          <button
            type="button"
            className={`${s.arrow} ${s.next}`}
            aria-label="Next photo"
            onClick={(e) => {
              e.stopPropagation();
              step(1);
            }}
          >
            →
          </button>
        </div>
      )}
    </>
  );
}
