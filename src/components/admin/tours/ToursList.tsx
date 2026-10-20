"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { CircleAlert, ExternalLink, Plus, Rotate3d } from "lucide-react";
import { createTour } from "@/app/admin/tour-actions";
import { useAdminUi } from "../AdminRoot";
import { ago, nowMs } from "@/lib/admin/format";
import { cld, isCloudinary } from "@/lib/mediaUrl";
import type { AdminTour } from "@/lib/admin/types";
import s from "./tours.module.css";

interface Props {
  tours: AdminTour[];
  projects: { slug: string; name: string }[];
  targets: Record<string, { type: string; label: string }[]>;
}

export function coverOf(t: Pick<AdminTour, "scenes" | "coverUrl">) {
  if (t.coverUrl) return cld(t.coverUrl, "c_fill,w_640,h_360,f_auto,q_auto");
  const p = t.scenes[0]?.thumb || t.scenes[0]?.panorama;
  if (!p) return null;
  return isCloudinary(p) ? cld(p, "c_fill,w_640,h_360,f_auto,q_auto") : p;
}

export function ToursList({ tours, projects, targets }: Props) {
  const [adding, setAdding] = useState(false);
  const now = nowMs();
  const live = tours.filter((t) => t.published).length;

  return (
    <div className="ad-page">
      <div className="ad-page-head">
        <div>
          <h1>360° Tours</h1>
          <div className="ad-sub">
            {tours.length} tour{tours.length === 1 ? "" : "s"} · {live} live on the website · each tour is shown on every unit of its type
          </div>
        </div>
        <button type="button" className="ad-btn ad-btn-primary" onClick={() => setAdding(true)}>
          <Plus size={16} />
          New tour
        </button>
      </div>

      {tours.length ? (
        <div className={s.cards}>
          {tours.map((t) => {
            const cover = coverOf(t);
            return (
              <div key={t.id} className={s.card}>
                <Link href={`/admin/tours/${t.id}`} className={s.cardLink} aria-label={`Edit ${t.title}`}>
                  <span className={s.cover}>
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element -- Cloudinary or /public thumbnail
                      <img src={cover} alt="" />
                    ) : (
                      <Rotate3d size={28} />
                    )}
                    <span className={`ad-tag ${t.published ? "ad-tag-ok" : "ad-tag-neutral"}`} style={{ position: "absolute", left: 10, top: 10 }}>
                      {t.published ? "Live" : "Draft"}
                    </span>
                  </span>
                  <span className={s.cardBody}>
                    <span className="ad-kicker">
                      {t.projectName}
                      {t.type ? ` · ${t.type}` : ""}
                    </span>
                    <strong className={s.cardTitle}>{t.title}</strong>
                    <span className="ad-muted" style={{ fontSize: 12.5 }}>
                      {t.source === "embed" ? "Matterport / Kuula tour" : `${t.scenes.length} scene${t.scenes.length === 1 ? "" : "s"} · ${t.scenes.reduce((n, x) => n + x.hotspots.length, 0)} hotspots`} · edited{" "}
                      {ago(t.updatedAt, now)}
                    </span>
                  </span>
                </Link>
                {t.published && (
                  <a className={s.view} href={`/tours/${t.id}`} target="_blank" rel="noreferrer" title="Open on the website" aria-label={`Open ${t.title} on the website`}>
                    <ExternalLink size={15} />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="ad-empty">
          <div className="ad-empty-icon">
            <Rotate3d size={20} />
          </div>
          <h4>No tours yet</h4>
          <p className="ad-muted" style={{ margin: 0 }}>
            Upload equirectangular 360° panoramas of a show apartment, link the rooms with hotspots and publish.
          </p>
        </div>
      )}

      {adding && <NewTour projects={projects} targets={targets} onClose={() => setAdding(false)} />}
    </div>
  );
}

function NewTour({ projects, targets, onClose }: { projects: Props["projects"]; targets: Props["targets"]; onClose: () => void }) {
  const { toast } = useAdminUi();
  const [slug, setSlug] = useState(projects[0]?.slug ?? "");
  const [type, setType] = useState("");
  const [title, setTitle] = useState("");
  const [err, setErr] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const first = useRef<HTMLSelectElement>(null);
  const types = targets[slug] ?? [];

  useEffect(() => {
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="ad-backdrop" onClick={onClose}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="nt-title"
        className="ad-dialog"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await createTour({ projectSlug: slug, type, title });
            if (r && !r.ok) {
              setErr(r.fields ?? {});
              toast(r.error, "err");
            }
          });
        }}
      >
        <div className="ad-dialog-body" style={{ gap: 12 }}>
          <h4 id="nt-title">New 360° tour</h4>
          <div className="ad-field">
            <label htmlFor="nt-proj">Project</label>
            <select
              ref={first}
              id="nt-proj"
              className="ad-input"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setType("");
              }}
            >
              {projects.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="ad-field">
            <label htmlFor="nt-type">Unit type</label>
            <select
              id="nt-type"
              className="ad-input"
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                const t = types.find((x) => x.type === e.target.value);
                if (t && !title) setTitle(`${t.label || t.type} show apartment`);
              }}
            >
              <option value="">Whole project (no unit type)</option>
              {types.map((t) => (
                <option key={t.type} value={t.type}>
                  {t.type}
                  {t.label ? ` · ${t.label}` : ""}
                </option>
              ))}
            </select>
            <span className="ad-help">Every unit of this type links to the tour from its page and the building explorer.</span>
          </div>
          <div className="ad-field">
            <label htmlFor="nt-name">Title</label>
            <input id="nt-name" className="ad-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Three-bedroom sea-view residence" aria-invalid={!!err.title || undefined} />
            {err.title && (
              <span className="ad-error">
                <CircleAlert size={13} />
                {err.title}
              </span>
            )}
          </div>
        </div>
        <div className="ad-dialog-actions">
          <button type="button" className="ad-btn ad-btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="ad-btn ad-btn-primary" disabled={pending}>
            {pending ? "Creating…" : "Create tour"}
          </button>
        </div>
      </form>
    </div>
  );
}
