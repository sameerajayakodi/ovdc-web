"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition, type PointerEvent as RPointerEvent } from "react";
import {
  ArrowUpRight,
  ChevronLeft,
  CircleAlert,
  CircleCheck,
  Crosshair,
  Eye,
  Flag,
  Globe,
  GripVertical,
  ImageUp,
  Info,
  MousePointer2,
  Navigation,
  Trash2,
  X,
} from "lucide-react";
import { deleteTour, saveTour, type TourDraft } from "@/app/admin/tour-actions";
import type { TourHotspotRow } from "@/db/schema";
import { useAdminUi } from "../AdminRoot";
import { uploadFile } from "../media/upload";
import { TourViewer } from "@/components/tour/TourViewer";
import { embedHost, embedSrc } from "@/lib/embed";
import { slugify } from "@/lib/admin/format";
import { cld, isCloudinary, panoUrl } from "@/lib/mediaUrl";
import type { AdminMedia, AdminScene, AdminTour } from "@/lib/admin/types";
import type { Tour } from "@/lib/types";
import s from "./tours.module.css";

interface Props {
  tour: AdminTour;
  types: { type: string; label: string }[];
  unitRefs: { ref: string; type: string }[];
  library: AdminMedia[];
  uploads: { maxPx: number } | null;
}

type Tool = "select" | "nav" | "info" | "start";

const toDraft = (t: AdminTour): TourDraft => ({
  title: t.title,
  type: t.type,
  unitRef: t.unitRef,
  source: t.source,
  embedUrl: t.embedUrl,
  coverMediaId: t.coverMediaId,
  bedrooms: t.bedrooms,
  bathrooms: t.bathrooms,
  parking: t.parking,
  scenes: t.scenes.map((x) => ({ ...x, hotspots: x.hotspots.map((h) => ({ ...h })) })),
});

/** jsonb stores keys in its own order; compare drafts by value. */
const stable = (d: TourDraft) =>
  JSON.stringify(d, (_k, v) => (v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, v[k]])) : v));

const wrap = (y: number) => ((((y + 180) % 360) + 360) % 360) - 180;
const r1 = (n: number) => Math.round(n * 10) / 10;
const sceneSrc = (p: string, w: number) => (isCloudinary(p) ? cld(p, `f_auto,q_auto,w_${w},c_limit`) : p);
const nameFromFile = (f: string) =>
  f
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()
    .slice(0, 60);

export function TourEditor({ tour, types, unitRefs, library, uploads }: Props) {
  const { toast, confirm } = useAdminUi();
  const [draft, setDraft] = useState<TourDraft>(() => toDraft(tour));
  const [baseline, setBaseline] = useState(() => stable(toDraft(tour)));
  const [published, setPublished] = useState(tour.published);
  const [cur, setCur] = useState(0);
  const [hot, setHot] = useState<number | null>(null);
  const [tool, setTool] = useState<Tool>("select");
  const [cursor, setCursor] = useState<{ yaw: number; pitch: number } | null>(null);
  const [checks, setChecks] = useState<{ file: string; ok: boolean; msg: string }[]>([]);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [preview, setPreview] = useState(false);
  const [dragScene, setDragScene] = useState<number | null>(null);
  const [pending, start] = useTransition();
  const canvas = useRef<HTMLDivElement>(null);
  const dragHot = useRef<number | null>(null);

  const dirty = stable(draft) !== baseline;
  const scenes = draft.scenes;
  const sceneCount = useRef(scenes.length);
  useEffect(() => {
    sceneCount.current = scenes.length;
  }, [scenes.length]);
  const scene = scenes[cur] as AdminScene | undefined;
  const hs = scene && hot != null ? scene.hotspots[hot] : undefined;

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = <K extends keyof TourDraft>(k: K, v: TourDraft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const setScene = useCallback((i: number, patch: Partial<AdminScene>) => setDraft((d) => ({ ...d, scenes: d.scenes.map((x, j) => (j === i ? { ...x, ...patch } : x)) })), []);
  const setHotspot = useCallback(
    (i: number, h: number, patch: Partial<TourHotspotRow>) =>
      setDraft((d) => ({ ...d, scenes: d.scenes.map((x, j) => (j === i ? { ...x, hotspots: x.hotspots.map((y, k) => (k === h ? { ...y, ...patch } : y)) } : x)) })),
    [],
  );

  /* ───────── canvas geometry: equirectangular x ↔ yaw, y ↔ pitch ───────── */

  const xOf = (yaw: number) => ((((yaw + (scene?.rot ?? 0)) % 360) + 360) % 360) / 360;
  const yOf = (pitch: number) => (90 - pitch) / 180;
  const at = (e: { clientX: number; clientY: number }) => {
    const r = canvas.current!.getBoundingClientRect();
    const fx = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const fy = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    return { yaw: r1(wrap(fx * 360 - (scene?.rot ?? 0))), pitch: r1(Math.min(89, Math.max(-89, 90 - fy * 180))) };
  };

  function onCanvasDown(e: RPointerEvent<HTMLDivElement>) {
    if (!scene) return;
    const p = at(e);
    if (tool === "start") {
      setScene(cur, { yaw: p.yaw });
      setTool("select");
      return toast(`Starting view set for ${scene.name}`);
    }
    if (tool === "nav" || tool === "info") {
      const others = scenes.filter((_, i) => i !== cur);
      if (tool === "nav" && !others.length) return toast("Add another scene first, then link to it.", "err");
      const h: TourHotspotRow =
        tool === "nav" ? { t: "nav", to: others[0].key, yaw: p.yaw, pitch: p.pitch } : { t: "info", id: `info-${Date.now().toString(36)}`, kicker: "", title: "New point", body: "", yaw: p.yaw, pitch: p.pitch };
      setScene(cur, { hotspots: [...scene.hotspots, h] });
      setHot(scene.hotspots.length);
      setTool("select");
      return;
    }
    setHot(null);
  }

  function onMarkerDown(e: RPointerEvent, i: number) {
    e.stopPropagation();
    setHot(i);
    dragHot.current = i;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onMarkerMove(e: RPointerEvent) {
    if (dragHot.current == null || !(e.buttons & 1)) return;
    setHotspot(cur, dragHot.current, at(e));
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector('[role="alertdialog"]')) {
        (document.activeElement as HTMLElement | null)?.blur?.();
        setHot(null);
        setTool("select");
        return;
      }
      // Delete removes the selected hotspot, except while typing in a field.
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if ((e.key === "Delete" || e.key === "Backspace") && hot != null && scene) {
        setScene(cur, { hotspots: scene.hotspots.filter((_, k) => k !== hot) });
        setHot(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hot, scene, cur, setScene]);

  /* ───────── scenes ───────── */

  function uniqueKey(name: string, taken = scenes.map((x) => x.key)) {
    const base = slugify(name) || "scene";
    let k = base;
    for (let i = 2; taken.includes(k); i++) k = `${base}-${i}`;
    return k;
  }

  function addScenes(items: { name: string; url: string; mediaId: number | null }[]) {
    setDraft((d) => {
      const taken = d.scenes.map((x) => x.key);
      const added = items.map((it) => {
        const key = uniqueKey(it.name, taken);
        taken.push(key);
        return { key, name: it.name, short: it.name.split(" ")[0], note: "", panorama: it.url, thumb: "", mediaId: it.mediaId, yaw: 0, rot: 0, planX: 100, planY: 70, hotspots: [] } satisfies AdminScene;
      });
      return { ...d, scenes: [...d.scenes, ...added] };
    });
    // Select the newest scene (uploads arrive one after another).
    setCur(sceneCount.current + items.length - 1);
    sceneCount.current += items.length;
    setHot(null);
  }

  async function uploadPanos(files: FileList) {
    const list = [...files];
    setChecks([]);
    for (const f of list) {
      setProgress((p) => ({ ...p, [f.name]: 0 }));
      const res = await uploadFile(f, { folder: tour.projectSlug, kind: "360", maxPx: uploads?.maxPx, onProgress: (n) => setProgress((p) => ({ ...p, [f.name]: n })), alt: `${tour.title} · ${nameFromFile(f.name)}, 360° panorama` });
      setProgress((p) => {
        const n = { ...p };
        delete n[f.name];
        return n;
      });
      if (res.ok) {
        setChecks((c) => [...c, { file: f.name, ok: true, msg: ` ${res.media.width} × ${res.media.height}, ready.` }]);
        addScenes([{ name: nameFromFile(f.name), url: res.media.url, mediaId: res.media.id }]);
      } else {
        setChecks((c) => [...c, { file: f.name, ok: false, msg: ` ${res.error.replace(`${f.name}: `, "").replace(`${f.name} `, "")}` }]);
      }
    }
  }

  async function removeScene(i: number) {
    const x = scenes[i];
    const links = scenes.reduce((n, o) => n + o.hotspots.filter((h) => h.t === "nav" && h.to === x.key).length, 0);
    if (!(await confirm({ danger: true, title: `Remove ${x.name}?`, body: `${links ? `${links} link${links === 1 ? "" : "s"} from other rooms to it ${links === 1 ? "is" : "are"} removed too. ` : ""}The panorama stays in the Media library. Nothing changes on the website until you save.`, confirmLabel: "Remove scene" })))
      return;
    setDraft((d) => ({ ...d, scenes: d.scenes.filter((_, j) => j !== i).map((o) => ({ ...o, hotspots: o.hotspots.filter((h) => !(h.t === "nav" && h.to === x.key)) })) }));
    setCur((c) => Math.max(0, c >= i ? c - 1 : c));
    setHot(null);
  }

  function moveScene(from: number, to: number) {
    if (from === to) return;
    setDraft((d) => {
      const list = [...d.scenes];
      const [m] = list.splice(from, 1);
      list.splice(to, 0, m);
      return { ...d, scenes: list };
    });
    setCur(to);
  }

  /* ───────── save / publish ───────── */

  function save(publish?: boolean) {
    start(async () => {
      try {
        const r = await saveTour(tour.id, draft, publish);
        if (!r.ok) return toast(r.error, "err");
        setBaseline(stable(draft));
        setPublished(r.data!.published);
        toast(r.message ?? "Saved");
      } catch {
        toast("Could not save. Check your connection and try again.", "err");
      }
    });
  }

  async function remove() {
    if (!(await confirm({ danger: true, title: `Delete ${draft.title}?`, body: "The tour disappears from the website and its units. Panoramas stay in the Media library.", confirmLabel: "Delete tour" }))) return;
    start(async () => {
      const r = await deleteTour(tour.id);
      if (r && !r.ok) toast(r.error, "err");
    });
  }

  const previewTour = useMemo<Tour>(
    () => ({
      id: tour.id,
      projectSlug: tour.projectSlug,
      projectName: tour.projectName,
      projectLoc: "",
      unitRef: draft.unitRef,
      title: draft.title,
      typeLabel: draft.type,
      floorLabel: "",
      interior: 0,
      terrace: 0,
      bedrooms: draft.bedrooms,
      bathrooms: draft.bathrooms,
      price: 0,
      pricePerSqft: 0,
      parking: draft.parking,
      status: "A",
      panorama: scenes[0] ? panoUrl(scenes[0].panorama) : "",
      planRooms: tour.planRooms,
      scenes: scenes.map((x) => ({
        id: x.key,
        name: x.name,
        short: x.short || x.name,
        note: x.note,
        plan: [x.planX, x.planY],
        rot: x.rot,
        yaw: x.yaw,
        pos: "50% 50%",
        panorama: panoUrl(x.panorama),
        thumb: x.thumb || sceneSrc(x.panorama, 480),
        hs: x.hotspots.flatMap((h): Tour["scenes"][number]["hs"] =>
          h.t === "nav"
            ? h.to && scenes.some((o) => o.key === h.to)
              ? [{ t: "nav" as const, to: h.to, yaw: h.yaw, pitch: h.pitch }]
              : []
            : [{ t: "info" as const, id: h.id ?? String(h.yaw), yaw: h.yaw, pitch: h.pitch, kicker: h.kicker ?? "", title: h.title ?? "", body: h.body ?? "" }],
        ),
      })),
    }),
    [draft, scenes, tour],
  );

  const refsForType = unitRefs.filter((u) => !draft.type || u.type === draft.type);
  const libPanos = library.filter((m) => m.kind === "360" && !scenes.some((x) => x.mediaId === m.id));
  const libImages = library.filter((m) => m.kind === "image");
  const embedOk = embedSrc(draft.embedUrl);
  const host = embedHost(draft.embedUrl);
  const nameOf = (key?: string) => scenes.find((x) => x.key === key)?.name ?? "—";

  return (
    <div className={s.editor}>
      <div className={s.bar}>
        <Link href="/admin/tours" className="ad-btn ad-btn-icon" aria-label="All tours" title="All tours">
          <ChevronLeft size={18} />
        </Link>
        <div style={{ flex: "1 1 220px", minWidth: 0 }}>
          <div className="ad-kicker">360° Tours / Edit</div>
          <div className={s.barTitle}>
            {tour.projectName}
            {draft.unitRef ? ` · Unit ${draft.unitRef}` : ""}
            {draft.type ? ` · ${draft.type}` : ""}
          </div>
        </div>
        <span className={`ad-tag ${published ? "ad-tag-ok" : "ad-tag-neutral"}`}>{published ? "Published" : "Draft"}</span>
        {dirty && <span className="ad-tag ad-tag-warn">Unsaved changes</span>}
        <div className="ad-seg" role="group" aria-label="Source">
          <button type="button" aria-pressed={draft.source === "pano"} onClick={() => set("source", "pano")}>
            360° panoramas
          </button>
          <button type="button" aria-pressed={draft.source === "embed"} onClick={() => set("source", "embed")}>
            Matterport / Kuula
          </button>
        </div>
        {draft.source === "pano" && (
          <button type="button" className="ad-btn ad-btn-secondary" onClick={() => setPreview(true)} disabled={!scenes.length}>
            <Eye size={16} />
            Preview
          </button>
        )}
        <button type="button" className="ad-btn ad-btn-secondary" onClick={() => save()} disabled={pending || !dirty}>
          Save
        </button>
        <button type="button" className="ad-btn ad-btn-primary" onClick={() => save(!published)} disabled={pending}>
          <Globe size={16} />
          {published ? "Unpublish" : "Publish"}
        </button>
      </div>

      {draft.source === "embed" ? (
        <div className={s.embed}>
          <section className="ad-section">
            <div className="ad-section-head">
              <h5>Use a Matterport or Kuula tour instead</h5>
            </div>
            <div className="ad-section-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="ad-field">
                <label htmlFor="emb-url">Tour URL</label>
                <input id="emb-url" className="ad-input" value={draft.embedUrl} onChange={(e) => set("embedUrl", e.target.value)} placeholder="https://my.matterport.com/show/?m=…" />
              </div>
              {draft.embedUrl && (
                <div className={s.check} data-ok={!!embedOk || undefined}>
                  {embedOk ? <CircleCheck size={15} /> : <CircleAlert size={15} />}
                  {embedOk ? `${host} tour found. It plays full screen with OVDC's close and “Book a site visit” buttons.` : "Paste a my.matterport.com/show/?m=… or kuula.co/share/… link."}
                </div>
              )}
              <div className="ad-field">
                <label htmlFor="emb-cover">Card image</label>
                <select id="emb-cover" className="ad-input" value={draft.coverMediaId ?? ""} onChange={(e) => set("coverMediaId", e.target.value ? Number(e.target.value) : null)}>
                  <option value="">Project photo</option>
                  {libImages.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                <span className="ad-help">Shown on the 360° Tours page. Upload photos in the Media library.</span>
              </div>
              <p className="ad-muted" style={{ fontSize: 12.5, margin: 0 }}>
                Hotspots, the minimap and day/night views are managed inside Matterport or Kuula.
              </p>
            </div>
          </section>
          <section className="ad-section">
            <div className="ad-section-head">
              <h5>Preview</h5>
              {host && <span className="ad-muted" style={{ fontSize: 12 }}>{host}</span>}
            </div>
            {embedOk ? (
              <iframe className={s.embedFrame} src={embedOk} title="Embedded tour preview" allow="fullscreen; xr-spatial-tracking" allowFullScreen />
            ) : (
              <div className={s.embedEmpty}>The preview appears here once the link is valid.</div>
            )}
          </section>
          <TourSettings draft={draft} set={set} types={types} refs={refsForType} onDelete={remove} pending={pending} />
        </div>
      ) : (
        <div className={s.workspace}>
          <aside className={s.scenes} aria-label="Scenes">
            <div className={s.scenesHead}>
              <strong>Scenes · {scenes.length}</strong>
              <span className="ad-muted">Drag to reorder</span>
            </div>
            <div role="list">
              {scenes.map((x, i) => (
                <div
                  key={x.key}
                  role="listitem"
                  draggable
                  className={s.sceneItem}
                  data-on={i === cur || undefined}
                  data-drag={dragScene === i || undefined}
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = "move";
                    setDragScene(i);
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragScene != null) moveScene(dragScene, i);
                    setDragScene(null);
                  }}
                  onDragEnd={() => setDragScene(null)}
                >
                  <span aria-hidden="true" className={s.grip}>
                    <GripVertical size={14} />
                  </span>
                  <button
                    type="button"
                    className={s.sceneBtn}
                    onClick={() => {
                      setCur(i);
                      setHot(null);
                    }}
                    aria-current={i === cur || undefined}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- panorama thumbnail */}
                    <img src={x.thumb || sceneSrc(x.panorama, 240)} alt="" />
                    <span style={{ minWidth: 0 }}>
                      <span className={s.sceneName}>
                        {x.name}
                        {i === 0 && (
                          <span title="First scene" style={{ color: "var(--a-gold-text)", display: "inline-flex", marginLeft: 4 }}>
                            <Flag size={12} />
                          </span>
                        )}
                      </span>
                      <span className="ad-muted" style={{ fontSize: 11.5 }}>
                        {x.hotspots.length} hotspot{x.hotspots.length === 1 ? "" : "s"}
                      </span>
                    </span>
                  </button>
                </div>
              ))}
            </div>
            <div className={s.add}>
              <label className={s.drop} data-off={!uploads || undefined}>
                <input type="file" accept="image/jpeg,image/png" multiple className="ad-sr" aria-label="Add panoramas" disabled={!uploads} onChange={(e) => e.target.files && (uploadPanos(e.target.files), (e.target.value = ""))} />
                <span style={{ display: "flex", gap: 6, alignItems: "center", fontWeight: 700, fontSize: 13 }}>
                  <ImageUp size={16} />
                  Add panoramas
                </span>
                <span className="ad-muted" style={{ fontSize: 11.5 }}>
                  Equirectangular JPG/PNG · 2:1 · up to {Math.round((uploads?.maxPx ?? 25e6) / 1e6)} MP, e.g. 7000 × 3500
                </span>
              </label>
              {libPanos.length > 0 && (
                <select
                  className="ad-input"
                  aria-label="Add a panorama from the library"
                  value=""
                  onChange={(e) => {
                    const m = libPanos.find((x) => x.id === Number(e.target.value));
                    if (m) addScenes([{ name: nameFromFile(m.name), url: m.url, mediaId: m.id }]);
                  }}
                >
                  <option value="">Add from Media library…</option>
                  {libPanos.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              )}
              {Object.entries(progress).map(([f, n]) => (
                <div key={f} style={{ fontSize: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span className={s.ellipsis}>{f}</span>
                    <span className="ad-muted">{n}%</span>
                  </div>
                  <div className="ad-meter">
                    <span style={{ width: `${n}%` }} />
                  </div>
                </div>
              ))}
              {checks.map((c, i) => (
                <div key={i} className={s.check} data-ok={c.ok || undefined}>
                  {c.ok ? <CircleCheck size={14} /> : <CircleAlert size={14} />}
                  <div>
                    <strong>{c.file}</strong>
                    {c.msg}
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <div className={s.center}>
            {scene ? (
              <>
                <div className={s.tools}>
                  <div className="ad-seg" role="group" aria-label="Tool">
                    <button type="button" aria-pressed={tool === "select"} onClick={() => setTool("select")}>
                      <MousePointer2 size={14} />
                      Select
                    </button>
                    <button type="button" aria-pressed={tool === "nav"} onClick={() => setTool("nav")}>
                      <Navigation size={14} />
                      Room link
                    </button>
                    <button type="button" aria-pressed={tool === "info"} onClick={() => setTool("info")}>
                      <Info size={14} />
                      Info point
                    </button>
                  </div>
                  <div style={{ flex: 1 }} />
                  <span className={s.coords}>{cursor ? `yaw ${cursor.yaw}° · pitch ${cursor.pitch}°` : `start view ${scene.yaw}°`}</span>
                  <button type="button" className="ad-btn ad-btn-secondary" aria-pressed={tool === "start"} onClick={() => setTool(tool === "start" ? "select" : "start")} data-on={tool === "start" || undefined}>
                    <Crosshair size={15} />
                    Set starting view
                  </button>
                </div>
                <div
                  ref={canvas}
                  className={s.canvas}
                  data-tool={tool}
                  role="application"
                  aria-label={`360° panorama of ${scene.name}, unwrapped. Click to place hotspots.`}
                  onPointerDown={onCanvasDown}
                  onPointerMove={(e) => setCursor(at(e))}
                  onPointerLeave={() => setCursor(null)}
                  style={{ backgroundImage: `url("${sceneSrc(scene.panorama, 2400)}")` }}
                >
                  <span className={s.fov} style={{ left: `${xOf(scene.yaw) * 100}%` }} data-edge={xOf(scene.yaw) < 0.04 ? "left" : xOf(scene.yaw) > 0.96 ? "right" : undefined} aria-hidden="true">
                    <span>Start</span>
                  </span>
                  {scene.hotspots.map((h, i) => (
                    <button
                      key={i}
                      type="button"
                      className={s.marker}
                      data-kind={h.t}
                      data-on={hot === i || undefined}
                      style={{ left: `${xOf(h.yaw) * 100}%`, top: `${yOf(h.pitch) * 100}%` }}
                      onPointerDown={(e) => onMarkerDown(e, i)}
                      onPointerMove={onMarkerMove}
                      onPointerUp={() => (dragHot.current = null)}
                      aria-label={h.t === "nav" ? `Link to ${nameOf(h.to)}` : `Info: ${h.title}`}
                    >
                      <span className={s.markerDot}>{h.t === "nav" ? <ArrowUpRight size={15} /> : <Info size={15} />}</span>
                      <span className={s.markerLabel}>{h.t === "nav" ? nameOf(h.to) : h.title}</span>
                    </button>
                  ))}
                  {tool !== "select" && (
                    <span className={s.hint}>{tool === "start" ? "Click where visitors should be looking when this room opens" : tool === "nav" ? "Click a doorway to link it to another room" : "Click a feature to describe it"}</span>
                  )}
                </div>
                <p className="ad-muted" style={{ fontSize: 12, margin: 0 }}>
                  The whole panorama, unwrapped: left and right edges meet behind the viewer. Drag a marker to move it, press Delete to remove the selected one. Use Preview to check it in 3D.
                </p>
              </>
            ) : (
              <div className="ad-empty" style={{ flex: 1 }}>
                <div className="ad-empty-icon">
                  <ImageUp size={20} />
                </div>
                <h4>Add the first panorama</h4>
                <p className="ad-muted" style={{ margin: 0 }}>
                  Each room is one equirectangular 360° image (2:1). The first scene is where the tour starts.
                </p>
              </div>
            )}
          </div>

          <aside className={s.inspector} aria-label="Inspector">
            {scene && hs ? (
              <section className={s.panel}>
                <div className={s.panelHead}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="ad-kicker">Hotspot · {scene.name}</div>
                    <strong>{hs.t === "nav" ? `Link to ${nameOf(hs.to)}` : hs.title || "Info point"}</strong>
                  </div>
                  <button type="button" className="ad-btn ad-btn-icon" onClick={() => setHot(null)} aria-label="Close hotspot">
                    <X size={16} />
                  </button>
                </div>
                <div className={s.panelBody}>
                  <div className="ad-seg" role="group" aria-label="Hotspot type">
                    <button type="button" aria-pressed={hs.t === "nav"} onClick={() => setHotspot(cur, hot!, { t: "nav", to: hs.to ?? scenes.find((_, i) => i !== cur)?.key })}>
                      <Navigation size={14} />
                      Room link
                    </button>
                    <button type="button" aria-pressed={hs.t === "info"} onClick={() => setHotspot(cur, hot!, { t: "info", title: hs.title || "New point", id: hs.id ?? `info-${Date.now().toString(36)}` })}>
                      <Info size={14} />
                      Info point
                    </button>
                  </div>
                  {hs.t === "nav" ? (
                    <div className="ad-field">
                      <label htmlFor="h-target">Go to scene</label>
                      <select id="h-target" className="ad-input" value={hs.to ?? ""} onChange={(e) => setHotspot(cur, hot!, { to: e.target.value })}>
                        {scenes
                          .filter((_, i) => i !== cur)
                          .map((o) => (
                            <option key={o.key} value={o.key}>
                              {o.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  ) : (
                    <>
                      <div className="ad-field">
                        <label htmlFor="h-kicker">Label</label>
                        <input id="h-kicker" className="ad-input" value={hs.kicker ?? ""} onChange={(e) => setHotspot(cur, hot!, { kicker: e.target.value })} placeholder="Kitchen" maxLength={40} />
                      </div>
                      <div className="ad-field">
                        <label htmlFor="h-title">Title</label>
                        <input id="h-title" className="ad-input" value={hs.title ?? ""} onChange={(e) => setHotspot(cur, hot!, { title: e.target.value })} maxLength={80} />
                      </div>
                      <div className="ad-field">
                        <label htmlFor="h-text">Text</label>
                        <textarea id="h-text" className="ad-input" value={hs.body ?? ""} onChange={(e) => setHotspot(cur, hot!, { body: e.target.value })} maxLength={400} style={{ minHeight: 80 }} />
                      </div>
                    </>
                  )}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div className="ad-field">
                      <label htmlFor="h-yaw">Yaw °</label>
                      <input id="h-yaw" className="ad-input" type="number" step="1" value={hs.yaw} onChange={(e) => setHotspot(cur, hot!, { yaw: r1(wrap(Number(e.target.value))) })} />
                    </div>
                    <div className="ad-field">
                      <label htmlFor="h-pitch">Pitch °</label>
                      <input id="h-pitch" className="ad-input" type="number" step="1" min={-89} max={89} value={hs.pitch} onChange={(e) => setHotspot(cur, hot!, { pitch: Math.max(-89, Math.min(89, Number(e.target.value))) })} />
                    </div>
                  </div>
                  <button
                    type="button"
                    className="ad-btn ad-btn-ghost"
                    style={{ color: "var(--a-danger-text)", alignSelf: "flex-start", paddingLeft: 0 }}
                    onClick={() => {
                      setScene(cur, { hotspots: scene.hotspots.filter((_, k) => k !== hot) });
                      setHot(null);
                    }}
                  >
                    <Trash2 size={14} />
                    Remove hotspot
                  </button>
                </div>
              </section>
            ) : scene ? (
              <section className={s.panel}>
                <div className={s.panelHead}>
                  <div style={{ flex: 1 }}>
                    <div className="ad-kicker">Scene {cur + 1}</div>
                    <strong>{scene.name}</strong>
                  </div>
                </div>
                <div className={s.panelBody}>
                  <div className="ad-field">
                    <label htmlFor="sc-name">Room name</label>
                    <input id="sc-name" className="ad-input" value={scene.name} onChange={(e) => setScene(cur, { name: e.target.value })} maxLength={60} />
                  </div>
                  <div className="ad-field">
                    <label htmlFor="sc-short">Short label</label>
                    <input id="sc-short" className="ad-input" value={scene.short} onChange={(e) => setScene(cur, { short: e.target.value })} maxLength={20} placeholder="Living" />
                    <span className="ad-help">Used in the room strip on phones.</span>
                  </div>
                  <div className="ad-field">
                    <label htmlFor="sc-note">Caption</label>
                    <input id="sc-note" className="ad-input" value={scene.note} onChange={(e) => setScene(cur, { note: e.target.value })} maxLength={160} placeholder="3.2 m ceilings · open-plan living" />
                  </div>
                  <div className="ad-field">
                    <label htmlFor="sc-yaw">Starting view (yaw °)</label>
                    <input id="sc-yaw" className="ad-input" type="number" value={scene.yaw} onChange={(e) => setScene(cur, { yaw: r1(wrap(Number(e.target.value))) })} />
                  </div>
                  {scene.mediaId && (
                    <Link href={`/admin/media?file=${scene.mediaId}`} className="ad-btn ad-btn-ghost ad-btn-sm" style={{ alignSelf: "flex-start", paddingLeft: 0 }}>
                      Open the panorama in the Media library
                    </Link>
                  )}
                  <button type="button" className="ad-btn ad-btn-ghost" style={{ color: "var(--a-danger-text)", alignSelf: "flex-start", paddingLeft: 0 }} onClick={() => removeScene(cur)}>
                    <Trash2 size={14} />
                    Remove scene
                  </button>
                </div>
              </section>
            ) : null}
            <TourSettings draft={draft} set={set} types={types} refs={refsForType} onDelete={remove} pending={pending} />
          </aside>
        </div>
      )}

      {preview && (
        <div className={s.preview} role="dialog" aria-modal="true" aria-label="Tour preview">
          <div className={s.previewBar}>
            <strong>Preview · {draft.title}</strong>
            <span className="ad-muted" style={{ fontSize: 12.5 }}>
              {dirty ? "Showing unsaved changes" : published ? "Same as the website" : "Draft"}
            </span>
            <div style={{ flex: 1 }} />
            <button type="button" className="ad-btn ad-btn-secondary" onClick={() => setPreview(false)} autoFocus>
              <X size={16} />
              Close preview
            </button>
          </div>
          <div className={s.previewBody}>
            <TourViewer tour={previewTour} embedded />
          </div>
        </div>
      )}
    </div>
  );
}

function TourSettings({
  draft,
  set,
  types,
  refs,
  onDelete,
  pending,
}: {
  draft: TourDraft;
  set: <K extends keyof TourDraft>(k: K, v: TourDraft[K]) => void;
  types: { type: string; label: string }[];
  refs: { ref: string; type: string }[];
  onDelete: () => void;
  pending: boolean;
}) {
  return (
    <section className={s.panel}>
      <div className={s.panelHead}>
        <strong style={{ flex: 1 }}>Tour</strong>
      </div>
      <div className={s.panelBody}>
        <div className="ad-field">
          <label htmlFor="t-title">Tour title</label>
          <input id="t-title" className="ad-input" value={draft.title} onChange={(e) => set("title", e.target.value)} maxLength={120} />
        </div>
        <div className="ad-field">
          <label htmlFor="t-type">Unit type</label>
          <select id="t-type" className="ad-input" value={draft.type} onChange={(e) => set("type", e.target.value)}>
            <option value="">Whole project</option>
            {types.map((t) => (
              <option key={t.type} value={t.type}>
                {t.type}
                {t.label ? ` · ${t.label}` : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="ad-field">
          <label htmlFor="t-unit">Unit shown for price</label>
          <input id="t-unit" className="ad-input" list="t-units" value={draft.unitRef} onChange={(e) => set("unitRef", e.target.value.toUpperCase())} placeholder="A-14B" maxLength={20} />
          <datalist id="t-units">
            {refs.slice(0, 300).map((r) => (
              <option key={r.ref} value={r.ref} />
            ))}
          </datalist>
          <span className="ad-help">The tour shows this unit&apos;s live price and status.</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div className="ad-field">
            <label htmlFor="t-beds">Bedrooms</label>
            <input id="t-beds" className="ad-input" value={draft.bedrooms} onChange={(e) => set("bedrooms", e.target.value)} placeholder="3 + study" />
          </div>
          <div className="ad-field">
            <label htmlFor="t-baths">Bathrooms</label>
            <input id="t-baths" className="ad-input" value={draft.bathrooms} onChange={(e) => set("bathrooms", e.target.value)} placeholder="3.5" />
          </div>
        </div>
        <div className="ad-field">
          <label htmlFor="t-park">Parking</label>
          <input id="t-park" className="ad-input" value={draft.parking} onChange={(e) => set("parking", e.target.value)} placeholder="2 parking bays" />
        </div>
        <button type="button" className="ad-btn ad-btn-ghost" style={{ color: "var(--a-danger-text)", alignSelf: "flex-start", paddingLeft: 0 }} onClick={onDelete} disabled={pending}>
          <Trash2 size={14} />
          Delete tour
        </button>
      </div>
    </section>
  );
}
