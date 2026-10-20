"use client";

import Link from "next/link";
import { useEffect, useMemo, useOptimistic, useRef, useState, useTransition, type DragEvent } from "react";
import {
  Check,
  FileText,
  Folder,
  FolderInput,
  Image as ImageIcon,
  LayoutGrid,
  Library,
  Link2,
  Map,
  Rotate3d,
  Search,
  SearchX,
  Trash2,
  Upload,
  Video,
  X,
  type LucideIcon,
} from "lucide-react";
import { deleteMedia, moveMedia, updateMedia } from "@/app/admin/media-actions";
import type { MediaKind } from "@/db/schema";
import { useAdminUi } from "../AdminRoot";
import { dateShort } from "@/lib/admin/format";
import { bytesLabel, cld, thumbUrl } from "@/lib/mediaUrl";
import type { AdminMedia } from "@/lib/admin/types";
import { uploadFile } from "./upload";
import s from "./media.module.css";

export interface PlanInfo {
  name: string;
  creditsPct: number;
  maxPx: number;
  maxImage: number;
  maxVideo: number;
}

interface Props {
  items: AdminMedia[];
  projects: { slug: string; name: string }[];
  plan: PlanInfo | null;
  initialFolder: string;
  initialOpen: number | null;
}

const KINDS: { k: MediaKind | "all"; label: string; icon: LucideIcon }[] = [
  { k: "all", label: "All", icon: LayoutGrid },
  { k: "image", label: "Images", icon: ImageIcon },
  { k: "video", label: "Video", icon: Video },
  { k: "360", label: "360°", icon: Rotate3d },
  { k: "pdf", label: "PDF", icon: FileText },
];
export const KIND_BADGE: Record<MediaKind, string> = { image: "IMG", video: "VIDEO", "360": "360°", pdf: "PDF" };
const USE_ICON = { plan: Map, tour: Rotate3d, scene: Rotate3d };

export function metaOf(m: Pick<AdminMedia, "kind" | "width" | "height" | "bytes" | "duration" | "pages">) {
  const size = bytesLabel(m.bytes);
  if (m.kind === "pdf") return `${m.pages || 1} page${m.pages === 1 ? "" : "s"} · ${size}`;
  if (m.kind === "video") {
    const min = Math.floor(m.duration / 60);
    const sec = Math.round(m.duration % 60);
    return `${min}m ${String(sec).padStart(2, "0")}s · ${m.height ? `${m.height}p · ` : ""}${size}`;
  }
  return `${m.width} × ${m.height} · ${m.kind === "360" ? "360° · " : ""}${size}`;
}

interface Upload {
  id: number;
  name: string;
  pct: number;
  error?: string;
}

export function MediaLibrary({ items, projects, plan, initialFolder, initialOpen }: Props) {
  const { toast, confirm } = useAdminUi();
  const [folder, setFolder] = useState(initialFolder);
  const [kind, setKind] = useState<MediaKind | "all">("all");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<number[]>([]);
  const [cur, setCur] = useState<number | null>(initialOpen ?? items[0]?.id ?? null);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [pending, start] = useTransition();
  const [list, patch] = useOptimistic(items, (cur: AdminMedia[], p: { ids: number[]; patch?: Partial<AdminMedia>; remove?: boolean }) =>
    p.remove ? cur.filter((m) => !p.ids.includes(m.id)) : cur.map((m) => (p.ids.includes(m.id) ? { ...m, ...p.patch } : m)),
  );
  const seq = useRef(0);

  const folderName = (f: string) => (f === "all" ? "All media" : f === "web" ? "Website & blog" : (projects.find((p) => p.slug === f)?.name ?? f));
  const target = folder === "all" ? "web" : folder;

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: list.length };
    for (const m of list) c[m.folder] = (c[m.folder] ?? 0) + 1;
    return c;
  }, [list]);
  const byKind = useMemo(() => {
    const b: Record<MediaKind, number> = { image: 0, "360": 0, video: 0, pdf: 0 };
    for (const m of list) b[m.kind] += m.bytes;
    return b;
  }, [list]);
  const total = byKind.image + byKind["360"] + byKind.video + byKind.pdf;

  const ql = q.trim().toLowerCase();
  const inFolder = list.filter((m) => folder === "all" || m.folder === folder);
  const shown = inFolder.filter((m) => (kind === "all" || m.kind === kind) && (!ql || `${m.name} ${m.alt}`.toLowerCase().includes(ql)));
  const current = list.find((m) => m.id === cur) ?? null;

  function pickFolder(f: string) {
    setFolder(f);
    setSel([]);
    const qs = new URLSearchParams(window.location.search);
    if (f === "all") qs.delete("folder");
    else qs.set("folder", f);
    window.history.replaceState(null, "", `?${qs}`);
  }

  async function addFiles(files: FileList | File[]) {
    const arr = [...files];
    if (!arr.length) return;
    await Promise.all(
      arr.map(async (file) => {
        const id = ++seq.current;
        setUploads((u) => [...u, { id, name: file.name, pct: 0 }]);
        const res = await uploadFile(file, { folder: target, maxPx: plan?.maxPx, onProgress: (pct) => setUploads((u) => u.map((x) => (x.id === id ? { ...x, pct } : x))) });
        if (res.ok) {
          setUploads((u) => u.filter((x) => x.id !== id));
          toast(res.message ?? `${file.name} uploaded`);
          setCur(res.media.id);
        } else {
          setUploads((u) => u.map((x) => (x.id === id ? { ...x, error: res.error } : x)));
          toast(res.error, "err");
        }
      }),
    );
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  }

  function move(to: string) {
    const ids = sel;
    if (!ids.length || !to) return;
    start(async () => {
      patch({ ids, patch: { folder: to } });
      const r = await moveMedia(ids, to);
      toast(r.ok ? (r.message ?? "Moved") : r.error, r.ok ? "ok" : "err");
      if (r.ok) setSel([]);
    });
  }

  async function remove(ids: number[]) {
    if (!ids.length) return;
    const names = list.filter((m) => ids.includes(m.id));
    const used = names.filter((m) => m.used.length);
    const ok = await confirm({
      danger: true,
      title: ids.length === 1 ? `Delete ${names[0]?.name}?` : `Delete ${ids.length} files?`,
      body: `${ids.length === 1 ? "The file is" : "The files are"} removed from Cloudinary for good.${used.length ? ` ${used.length === 1 ? "One file is" : `${used.length} files are`} still used on the website and will be kept.` : ""}`,
      confirmLabel: "Delete",
    });
    if (!ok) return;
    start(async () => {
      const free = ids.filter((id) => !used.some((u) => u.id === id));
      if (free.length) patch({ ids: free, remove: true });
      const r = await deleteMedia(ids);
      toast(r.ok ? (r.message ?? "Deleted") : r.error, r.ok ? "ok" : "err");
      if (r.ok) {
        setSel((x) => x.filter((id) => !r.data!.deleted.includes(id)));
        if (cur && r.data!.deleted.includes(cur)) setCur(null);
      }
    });
  }

  return (
    <div className={s.wrap}>
      <aside className={s.folders} aria-label="Folders">
        <div className={s.storage}>
          <div className="ad-muted" style={{ fontSize: 12 }}>
            Storage
          </div>
          <div style={{ fontWeight: 800, fontSize: 18 }}>
            {bytesLabel(total)} <span className="ad-muted" style={{ fontWeight: 400, fontSize: 13 }}>in {list.length} files</span>
          </div>
          <div className={s.meter} aria-hidden="true">
            <span style={{ flex: byKind.image, background: "var(--a-text)" }} title="Images" />
            <span style={{ flex: byKind["360"], background: "var(--a-accent)" }} title="360°" />
            <span style={{ flex: byKind.video, background: "var(--a-sold)" }} title="Video" />
            <span style={{ flex: byKind.pdf, background: "color-mix(in srgb, var(--a-text) 40%, transparent)" }} title="PDF" />
            {!total && <span style={{ flex: 1, background: "var(--a-n200)" }} />}
          </div>
          <div className={s.legend}>
            <span>Images {bytesLabel(byKind.image)}</span>
            <span>360° {bytesLabel(byKind["360"])}</span>
            <span>Video {bytesLabel(byKind.video)}</span>
            <span>PDF {bytesLabel(byKind.pdf)}</span>
          </div>
          {plan && (
            <div className="ad-muted" style={{ fontSize: 11.5, marginTop: 8 }}>
              Cloudinary {plan.name} plan · {plan.creditsPct.toFixed(1)}% of this month&apos;s credits used
            </div>
          )}
        </div>
        <nav className={s.nav}>
          {[{ slug: "all", name: "All media" }, ...projects, { slug: "web", name: "Website & blog" }].map((f) => {
            const Icon = f.slug === "all" ? Library : Folder;
            return (
              <button key={f.slug} type="button" className={s.folder} data-on={folder === f.slug || undefined} data-sub={f.slug !== "all" && f.slug !== "web" ? true : undefined} onClick={() => pickFolder(f.slug)}>
                <Icon size={15} />
                <span>{f.name}</span>
                <span className="ad-muted">{counts[f.slug] ?? 0}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <div className={s.main}>
        <div className="ad-page-head">
          <div>
            <h1>Media library</h1>
            <div className="ad-sub">
              {folderName(folder)} · {shown.length} of {inFolder.length} file{inFolder.length === 1 ? "" : "s"} shown
            </div>
          </div>
          <label className="ad-btn ad-btn-primary" style={{ cursor: "pointer" }}>
            <input
              type="file"
              multiple
              accept="image/*,video/*,application/pdf"
              className="ad-sr"
              aria-label={`Upload files to ${folderName(target)}`}
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <Upload size={16} />
            Upload
          </label>
        </div>

        <div className={s.toolbar}>
          <div className="ad-search" style={{ flex: "0 1 260px" }}>
            <Search size={16} />
            <input className="ad-input" aria-label="Search media" placeholder="Search file name or alt text" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className={s.kinds} role="group" aria-label="File type">
            {KINDS.map((k) => (
              <button key={k.k} type="button" aria-pressed={kind === k.k} onClick={() => setKind(k.k)}>
                <k.icon size={14} />
                {k.label}
              </button>
            ))}
          </div>
          <div style={{ flex: 1 }} />
          {sel.length > 0 && (
            <>
              <span style={{ fontSize: 12.5 }}>{sel.length} selected</span>
              <label className={s.moveSel}>
                <FolderInput size={15} />
                <select className="ad-input" aria-label="Move selected to folder" value="" onChange={(e) => move(e.target.value)} disabled={pending}>
                  <option value="">Move to…</option>
                  {[...projects, { slug: "web", name: "Website & blog" }].map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" className="ad-btn ad-btn-secondary" style={{ color: "var(--a-danger-text)" }} onClick={() => remove(sel)} disabled={pending}>
                <Trash2 size={15} />
                Delete
              </button>
              <button type="button" className="ad-btn ad-btn-icon" aria-label="Clear selection" onClick={() => setSel([])}>
                <X size={16} />
              </button>
            </>
          )}
        </div>

        <div
          className={s.grid}
          data-over={dragOver || undefined}
          onDragOver={(e) => {
            if (!e.dataTransfer.types.includes("Files")) return;
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node | null) && setDragOver(false)}
          onDrop={onDrop}
        >
          {shown.map((m) => {
            const on = sel.includes(m.id);
            return (
              <div key={m.id} className={s.item}>
                <button type="button" className={s.thumb} data-cur={cur === m.id || undefined} onClick={() => setCur(m.id)} aria-label={m.name}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary already sizes and converts thumbnails */}
                  <img src={thumbUrl(m, 360)} alt="" loading="lazy" />
                  <span className={s.badge} data-kind={m.kind}>
                    {KIND_BADGE[m.kind]}
                  </span>
                  {m.kind !== "pdf" && m.kind !== "video" && !m.alt && <span className={s.noAlt}>No alt text</span>}
                </button>
                <span
                  role="checkbox"
                  tabIndex={0}
                  aria-checked={on}
                  aria-label={`Select ${m.name}`}
                  className={s.check}
                  data-on={on || undefined}
                  onClick={() => setSel((x) => (x.includes(m.id) ? x.filter((i) => i !== m.id) : [...x, m.id]))}
                  onKeyDown={(e) => (e.key === " " || e.key === "Enter") && (e.preventDefault(), setSel((x) => (x.includes(m.id) ? x.filter((i) => i !== m.id) : [...x, m.id])))}
                >
                  {on && <Check size={12} strokeWidth={3} />}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div className={s.name}>{m.name}</div>
                  <div className="ad-muted" style={{ fontSize: 11.5 }}>
                    {metaOf(m)}
                  </div>
                </div>
              </div>
            );
          })}
          {!shown.length && (
            <div className={s.empty}>
              {inFolder.length ? <SearchX size={22} /> : <Upload size={22} />}
              <strong>{inFolder.length ? "No files match" : `Drop files here to add them to ${folderName(target)}`}</strong>
              <span className="ad-muted">
                {inFolder.length
                  ? "Try another search or file type."
                  : `Photos and renders up to ${bytesLabel(plan?.maxImage ?? 10 * 1024 ** 2)}, 360° panoramas (2:1), videos up to ${bytesLabel(plan?.maxVideo ?? 100 * 1024 ** 2)} and PDFs.`}
              </span>
            </div>
          )}
        </div>
      </div>

      <aside className={s.detail} aria-label="File details">
        {uploads.length > 0 && (
          <div className={s.uploads}>
            <div className={s.uploadsHead}>
              <strong>
                Uploading {uploads.filter((u) => !u.error).length} file{uploads.length === 1 ? "" : "s"}
              </strong>
              {uploads.some((u) => u.error) && (
                <button type="button" className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => setUploads((u) => u.filter((x) => !x.error))}>
                  Clear errors
                </button>
              )}
            </div>
            {uploads.map((u) => (
              <div key={u.id} className={s.upload}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span className={s.name}>{u.name}</span>
                  <span className="ad-muted">{u.error ? "Failed" : `${u.pct}%`}</span>
                </div>
                {u.error ? (
                  <div style={{ fontSize: 11.5, color: "var(--a-danger-text)", marginTop: 3 }}>{u.error}</div>
                ) : (
                  <>
                    <div className="ad-meter" style={{ marginTop: 4 }}>
                      <span style={{ width: `${u.pct}%` }} />
                    </div>
                    <div className="ad-muted" style={{ fontSize: 11, marginTop: 3 }}>
                      {u.pct < 100 ? "Uploading to Cloudinary" : "Saving to the library"}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
        {current ? <Detail key={current.id} m={current} folderName={folderName(current.folder)} onDelete={() => remove([current.id])} pending={pending} /> : <p className={s.hint}>Select a file to edit its alt text, copy its link or see where it is used.</p>}
      </aside>
    </div>
  );
}

function Detail({ m, folderName, onDelete, pending }: { m: AdminMedia; folderName: string; onDelete: () => void; pending: boolean }) {
  const { toast } = useAdminUi();
  const [alt, setAlt] = useState(m.alt);
  const [served, setServed] = useState<number | null>(null);
  const [saving, start] = useTransition();
  const visual = m.kind === "image" || m.kind === "360";
  const deliver = visual ? cld(m.url, "f_auto,q_auto,w_1600,c_limit") : m.url;

  // What visitors actually download: Cloudinary's optimised version, measured once.
  useEffect(() => {
    if (!visual) return;
    let live = true;
    fetch(deliver, { method: "HEAD" })
      .then((r) => Number(r.headers.get("content-length")))
      .then((n) => live && n > 0 && setServed(n))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [deliver, visual]);

  function saveAlt() {
    if (alt.trim() === m.alt) return;
    start(async () => {
      const r = await updateMedia(m.id, { alt });
      toast(r.ok ? (r.message ?? "Saved") : r.error, r.ok ? "ok" : "err");
    });
  }

  const pct = served && m.bytes ? Math.max(1, Math.round((served / m.bytes) * 100)) : null;

  return (
    <>
      <div className={s.preview}>
        {m.kind === "video" ? (
          <video src={cld(m.url, "q_auto,w_900,c_limit")} controls preload="metadata" poster={thumbUrl(m, 900, 560)} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- Cloudinary delivery URL
          <img src={thumbUrl(m, 900, 560)} alt={m.alt} />
        )}
      </div>
      <div className={s.block}>
        <div style={{ fontWeight: 700, fontSize: 14, wordBreak: "break-all" }}>{m.name}</div>
        <div className="ad-muted" style={{ fontSize: 12 }}>
          {metaOf(m)} · {folderName}
        </div>
        <div className="ad-muted" style={{ fontSize: 12 }}>
          Uploaded {dateShort(m.createdAt)} by {m.uploadedBy}
        </div>
      </div>
      {visual && (
        <div className={s.block} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div className="ad-kicker">Optimisation</div>
          <div className={s.row}>
            <span>Original</span>
            <span>{bytesLabel(m.bytes)}</span>
          </div>
          <div className={s.row}>
            <span>Served (WebP/AVIF, 1600 px)</span>
            <strong>{served ? bytesLabel(served) : "…"}</strong>
          </div>
          <div className="ad-meter" style={{ height: 6 }}>
            <span style={{ width: `${pct ?? 0}%`, background: "var(--a-available)" }} />
          </div>
          {pct != null && <div style={{ fontSize: 12, color: "var(--a-ok-text)" }}>{pct < 100 ? `${100 - pct}% smaller for visitors` : "Already optimised"}</div>}
        </div>
      )}
      {m.kind !== "video" && (
        <div className={s.block}>
          <div className="ad-field">
            <label htmlFor="md-alt">
              <span>{m.kind === "pdf" ? "Description" : "Alt text"}</span>
              <span>{alt.length} / 125</span>
            </label>
            <textarea
              id="md-alt"
              className="ad-input"
              value={alt}
              maxLength={125}
              onChange={(e) => setAlt(e.target.value)}
              onBlur={saveAlt}
              placeholder="Describe the image for screen readers and search"
              style={{ minHeight: 64 }}
              disabled={saving}
            />
          </div>
        </div>
      )}
      <div className={s.block} style={{ borderBottom: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        <div className="ad-kicker">
          Used in {m.used.length} place{m.used.length === 1 ? "" : "s"}
        </div>
        {m.used.map((u) => {
          const Icon = USE_ICON[u.kind];
          return (
            <Link key={u.href + u.label} href={u.href} className={s.use}>
              <Icon size={14} />
              <span>{u.label}</span>
            </Link>
          );
        })}
        {!m.used.length && (
          <span className="ad-muted" style={{ fontSize: 12.5 }}>
            Not used on the website yet.
          </span>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            className="ad-btn ad-btn-secondary"
            onClick={() =>
              navigator.clipboard
                .writeText(deliver)
                .then(() => toast("Link copied"))
                .catch(() => toast("Could not copy the link", "err"))
            }
          >
            <Link2 size={15} />
            Copy URL
          </button>
          <button type="button" className="ad-btn ad-btn-ghost" style={{ color: "var(--a-danger-text)" }} onClick={onDelete} disabled={pending || m.used.length > 0} title={m.used.length ? "Remove it from the website first" : undefined}>
            <Trash2 size={15} />
            Delete
          </button>
        </div>
      </div>
    </>
  );
}
