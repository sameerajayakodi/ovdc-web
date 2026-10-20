"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, ImageOff, Map as MapIcon, Plus, Rotate3d, Trash2, TriangleAlert, Upload, X } from "lucide-react";
import Link from "next/link";
import { deletePlan, savePlan, setPlanFile, type PlanInput } from "@/app/admin/plan-actions";
import type { PlanRoom } from "@/db/schema";
import { useAdminUi } from "../AdminRoot";
import { uploadFile } from "../media/upload";
import { FloorPlanSvg } from "@/components/project/FloorPlanSvg";
import { cld, thumbUrl } from "@/lib/mediaUrl";
import type { AdminPlan } from "@/lib/admin/types";
import s from "./plans.module.css";

interface Props {
  projects: { slug: string; name: string }[];
  slug: string;
  plans: AdminPlan[];
  inventoryTypes: string[];
  initialId: number | null;
  uploads: { maxPx: number } | null;
}

const SQFT_PER_M2 = 10.7639;
const M_TO_FT = 3.28084;

type Draft = PlanInput & { id: number | null };

const blank = (slug: string): Draft => ({ id: null, projectSlug: slug, type: "", key: "", label: "", sqft: 0, balcony: 0, facing: "", view: "", rooms: [{ name: "Living & dining", w: 0, l: 0 }] });
const toDraft = (p: AdminPlan): Draft => ({ id: p.id, projectSlug: p.projectSlug, type: p.type, key: p.key, label: p.label, sqft: p.sqft, balcony: p.balcony, facing: p.facing, view: p.view, rooms: p.rooms.map((r) => ({ name: r.name, w: r.w, l: r.l })) }); // jsonb reorders keys; rebuild in a fixed order

export function PlansConsole({ projects, slug, plans, inventoryTypes, initialId, uploads }: Props) {
  const router = useRouter();
  const { toast, confirm } = useAdminUi();
  const [curId, setCurId] = useState<number | "new" | null>(initialId);
  const cur = curId === "new" ? null : (plans.find((p) => p.id === curId) ?? null);
  const [draft, setDraft] = useState<Draft>(() => (cur ? toDraft(cur) : blank(slug)));
  const [unit, setUnit] = useState<"m" | "ft">("m");
  const [err, setErr] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const [progress, setProgress] = useState<number | null>(null);
  const project = projects.find((p) => p.slug === slug)!;

  const original = cur ? toDraft(cur) : blank(slug);
  const dirty = JSON.stringify(draft) !== JSON.stringify(original);
  const missing = inventoryTypes.filter((t) => !plans.some((p) => p.type === t));

  function pick(id: number | "new") {
    if (dirty && !window.confirm("Discard unsaved changes to this layout?")) return;
    const p = id === "new" ? null : plans.find((x) => x.id === id);
    setCurId(id);
    setDraft(p ? toDraft(p) : blank(slug));
    setErr({});
    const qs = new URLSearchParams({ project: slug });
    if (p) qs.set("type", p.type);
    window.history.replaceState(null, "", `?${qs}`);
  }

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const setRoom = (i: number, patch: Partial<PlanRoom>) => setDraft((d) => ({ ...d, rooms: d.rooms.map((r, j) => (j === i ? { ...r, ...patch } : r)) }));

  // Inputs show metres or feet; the database always keeps metres.
  const show = (m: number) => (m ? String(unit === "m" ? m : Math.round(m * M_TO_FT * 10) / 10) : "");
  const read = (v: string) => {
    const n = Number(v.replace(",", "."));
    return Number.isFinite(n) ? (unit === "m" ? n : Math.round((n / M_TO_FT) * 100) / 100) : 0;
  };
  const area = (r: PlanRoom) => r.w * r.l;
  const roomsM2 = draft.rooms.reduce((n, r) => n + area(r), 0);
  const areaLabel = (m2: number) => (unit === "m" ? `${m2.toFixed(1)} m²` : `${Math.round(m2 * SQFT_PER_M2).toLocaleString("en-US")} sqft`);

  function save() {
    start(async () => {
      try {
        const r = await savePlan(draft.id, draft);
        if (!r.ok) {
          setErr(r.fields ?? {});
          return toast(r.error, "err");
        }
        setErr({});
        toast(r.message ?? "Saved");
        if (draft.id == null) {
          setCurId(r.data!.id);
          setDraft((d) => ({ ...d, id: r.data!.id, key: d.key || d.type.split(/\s+/).pop()!.toUpperCase() }));
        }
      } catch {
        toast("Could not save. Check your connection and try again.", "err");
      }
    });
  }

  async function upload(file: File) {
    if (!cur) return;
    setProgress(0);
    const res = await uploadFile(file, { folder: slug, maxPx: uploads?.maxPx, onProgress: setProgress, alt: `${cur.type} · ${cur.label} floor plan` });
    setProgress(null);
    if (!res.ok) return toast(res.error, "err");
    if (res.media.kind !== "image" && res.media.kind !== "pdf") return toast("A floor plan must be an image or a PDF.", "err");
    start(async () => {
      const r = await setPlanFile(cur.id, res.media.id);
      toast(r.ok ? (r.message ?? "Saved") : r.error, r.ok ? "ok" : "err");
    });
  }

  async function removeFile() {
    if (!cur?.media) return;
    if (!(await confirm({ title: "Remove the drawing?", body: "The website shows the plan generated from the room sizes instead. The file stays in the Media library.", confirmLabel: "Remove" }))) return;
    start(async () => {
      const r = await setPlanFile(cur.id, null);
      toast(r.ok ? (r.message ?? "Removed") : r.error, r.ok ? "ok" : "err");
    });
  }

  async function remove() {
    if (!cur) return;
    const ok = await confirm({
      danger: true,
      title: `Delete ${cur.type}?`,
      body: `The layout disappears from the ${project.name} page and the explorer.${cur.units.total ? ` ${cur.units.total} units still use this type and will show without a floor plan.` : ""} Uploaded drawings stay in the Media library.`,
      confirmLabel: "Delete layout",
    });
    if (!ok) return;
    start(async () => {
      const r = await deletePlan(cur.id);
      toast(r.ok ? (r.message ?? "Deleted") : r.error, r.ok ? "ok" : "err");
      if (r.ok) {
        const next = plans.find((p) => p.id !== cur.id);
        setCurId(next?.id ?? null);
        setDraft(next ? toDraft(next) : blank(slug));
      }
    });
  }

  const preview = useMemo(() => draft.rooms.filter((r) => r.name && r.w > 0 && r.l > 0).map((r) => ({ name: r.name, dim: `${r.w} × ${r.l} m` })), [draft.rooms]);
  const drawing = cur?.media ? (cur.media.kind === "pdf" ? cld(cur.media.url, "pg_1,f_auto,q_auto,w_1400,c_limit").replace(/\.pdf$/i, ".jpg") : cld(cur.media.url, "f_auto,q_auto,w_1400,c_limit")) : null;
  const units = cur?.units;

  return (
    <div className="ad-page">
      <div className="ad-page-head">
        <div>
          <h1>Floor plans</h1>
          <div className="ad-sub">
            {project.name} · {plans.length} layout{plans.length === 1 ? "" : "s"} · {plans.filter((p) => !p.media).length} without an uploaded drawing
          </div>
        </div>
        <select className="ad-input" aria-label="Project" style={{ width: 240 }} value={slug} onChange={(e) => router.push(`/admin/floor-plans?project=${e.target.value}`)}>
          {projects.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.name}
            </option>
          ))}
        </select>
        <button type="button" className="ad-btn ad-btn-secondary" onClick={() => pick("new")}>
          <Plus size={16} />
          New layout
        </button>
        <label className="ad-btn ad-btn-primary" style={{ cursor: cur && uploads ? "pointer" : "not-allowed", opacity: cur && uploads ? 1 : 0.45 }} title={!uploads ? "File storage is not connected" : !cur ? "Save the layout first" : undefined}>
          <input
            type="file"
            accept="application/pdf,image/*"
            className="ad-sr"
            aria-label="Upload floor plan"
            disabled={!cur || !uploads || progress != null}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
              e.target.value = "";
            }}
          />
          <Upload size={16} />
          {progress != null ? `Uploading ${progress}%` : cur?.media ? "Replace floor plan" : "Upload floor plan"}
        </label>
      </div>

      {missing.length > 0 && (
        <div className={s.notice}>
          <TriangleAlert size={16} />
          <span>
            Units in the inventory use {missing.join(", ")}, which {missing.length === 1 ? "has" : "have"} no layout yet. Those units show without a floor plan on the website.
          </span>
          <button type="button" className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => (pick("new"), setDraft((d) => ({ ...d, type: missing[0] })))}>
            Add {missing[0]}
          </button>
        </div>
      )}

      <div className={s.body}>
        <nav className={s.list} aria-label="Layouts">
          {plans.map((p) => (
            <button key={p.id} type="button" className={s.planBtn} aria-current={curId === p.id || undefined} onClick={() => pick(p.id)}>
              <span className={s.planThumb}>
                {p.media ? (
                  // eslint-disable-next-line @next/next/no-img-element -- Cloudinary thumbnail
                  <img src={thumbUrl(p.media, 160, 120).replace("c_fill,g_auto", "c_pad,b_white")} alt="" />
                ) : p.rooms.some((r) => r.w > 0 && r.l > 0) ? (
                  <FloorPlanSvg rooms={p.rooms.filter((r) => r.w > 0 && r.l > 0).map((r) => ({ name: r.name, dim: `${r.w} × ${r.l} m` }))} title={p.type} />
                ) : (
                  <MapIcon size={18} />
                )}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className={s.planName}>
                  {p.type}
                  {p.label ? ` · ${p.label}` : ""}
                </span>
                <span className={s.planMeta}>
                  {p.sqft.toLocaleString("en-US")} sqft · {p.balcony} balcony
                </span>
                <span className={s.planTags}>
                  <span className="ad-tag ad-tag-neutral" style={{ padding: "1px 6px" }}>
                    {p.units.total ? `${p.units.total} units` : "No units"}
                  </span>
                  {p.tourId && (
                    <span className="ad-tag ad-tag-accent" style={{ padding: "1px 6px" }}>
                      360°
                    </span>
                  )}
                </span>
              </span>
              {!p.units.total && inventoryTypes.length > 0 && (
                <span title="No units of this type in the inventory" style={{ color: "var(--a-warn-text)", display: "flex" }}>
                  <TriangleAlert size={15} />
                </span>
              )}
            </button>
          ))}
          {curId === "new" && (
            <button type="button" className={s.planBtn} aria-current>
              <span className={s.planThumb}>
                <Plus size={18} />
              </span>
              <span className={s.planName}>{draft.type || "New layout"}</span>
            </button>
          )}
          {!plans.length && curId !== "new" && (
            <div className="ad-empty" style={{ padding: 20 }}>
              <MapIcon size={18} />
              <span className="ad-muted" style={{ fontSize: 13 }}>
                No layouts for {project.name} yet.
              </span>
            </div>
          )}
        </nav>

        {curId != null ? (
          <div className={s.detail}>
            <section className="ad-section">
              <div className="ad-section-head">
                <h5>{draft.type ? `${draft.type}${draft.label ? ` · ${draft.label}` : ""}` : "New layout"}</h5>
                {cur?.media && (
                  <span className="ad-muted" style={{ fontSize: 12, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={cur.media.name}>
                    {cur.media.name}
                  </span>
                )}
                {cur?.media && (
                  <button type="button" className="ad-btn ad-btn-ghost ad-btn-sm" onClick={removeFile} disabled={pending}>
                    <ImageOff size={14} />
                    Remove drawing
                  </button>
                )}
                {cur && (
                  <button type="button" className="ad-btn ad-btn-icon" onClick={remove} aria-label="Delete layout" title="Delete layout" disabled={pending}>
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              <div className={s.top}>
                <div className={s.drawing}>
                  {drawing ? (
                    // eslint-disable-next-line @next/next/no-img-element -- Cloudinary delivery URL
                    <img src={drawing} alt={`${draft.type} floor plan`} />
                  ) : preview.length ? (
                    <FloorPlanSvg rooms={preview} title={draft.type || "Layout"} />
                  ) : (
                    <span className="ad-muted">Add rooms below to generate a plan, or upload a drawing.</span>
                  )}
                  <span className={s.drawingTag}>{drawing ? "Uploaded drawing" : "Generated from room sizes"}</span>
                </div>
                <div className={s.side}>
                  <div className="ad-field">
                    <span className="ad-label">Matches units of type</span>
                    <div className={s.chips}>
                      {(inventoryTypes.length ? inventoryTypes : [draft.type || "—"]).map((t) => (
                        <button key={t} type="button" aria-pressed={draft.type === t} onClick={() => inventoryTypes.length && set("type", t)} disabled={!inventoryTypes.length}>
                          {t}
                        </button>
                      ))}
                    </div>
                    {!inventoryTypes.length && <span className="ad-help">This project has no unit inventory, so the layout shows on its own.</span>}
                  </div>
                  <div className={s.stats}>
                    <Stat k="Interior" v={`${draft.sqft.toLocaleString("en-US")} sqft`} />
                    <Stat k="Balcony" v={`${draft.balcony.toLocaleString("en-US")} sqft`} />
                    <Stat k="Rooms total" v={areaLabel(roomsM2)} />
                    <Stat k="Units" v={units?.total ? `${units.total} · ${units.A} available` : "—"} />
                  </div>
                  <div className="ad-seg" role="group" aria-label="Units of measure">
                    <button type="button" aria-pressed={unit === "m"} onClick={() => setUnit("m")}>
                      Metres
                    </button>
                    <button type="button" aria-pressed={unit === "ft"} onClick={() => setUnit("ft")}>
                      Feet
                    </button>
                  </div>
                  {cur?.tourId ? (
                    <Link href={`/admin/tours/${cur.tourId}`} className="ad-btn ad-btn-ghost ad-btn-sm" style={{ alignSelf: "flex-start", paddingLeft: 0 }}>
                      <Rotate3d size={14} />
                      Edit the 360° tour for this layout
                    </Link>
                  ) : null}
                </div>
              </div>
            </section>

            <section className="ad-section">
              <div className="ad-section-head">
                <h5>Layout details</h5>
                {dirty && <span className="ad-tag ad-tag-warn">Unsaved changes</span>}
              </div>
              <div className={s.form}>
                <F id="pl-type" label="Unit type" err={err.type}>
                  <input id="pl-type" className="ad-input" value={draft.type} onChange={(e) => set("type", e.target.value)} placeholder="Type C" aria-invalid={!!err.type || undefined} />
                </F>
                <F id="pl-key" label="Short code" err={err.key}>
                  <input id="pl-key" className="ad-input" value={draft.key} onChange={(e) => set("key", e.target.value.toUpperCase())} placeholder="C" maxLength={8} aria-invalid={!!err.key || undefined} />
                </F>
                <F id="pl-label" label="Bedrooms">
                  <input id="pl-label" className="ad-input" value={draft.label} onChange={(e) => set("label", e.target.value)} placeholder="3 Bed + study" />
                </F>
                <F id="pl-sqft" label="Interior (sqft)" err={err.sqft}>
                  <input id="pl-sqft" className="ad-input" inputMode="numeric" value={draft.sqft || ""} onChange={(e) => set("sqft", Number(e.target.value.replace(/\D/g, "")) || 0)} aria-invalid={!!err.sqft || undefined} />
                </F>
                <F id="pl-bal" label="Balcony (sqft)" err={err.balcony}>
                  <input id="pl-bal" className="ad-input" inputMode="numeric" value={draft.balcony || ""} onChange={(e) => set("balcony", Number(e.target.value.replace(/\D/g, "")) || 0)} aria-invalid={!!err.balcony || undefined} />
                </F>
                <F id="pl-face" label="Facing">
                  <input id="pl-face" className="ad-input" value={draft.facing} onChange={(e) => set("facing", e.target.value)} placeholder="West" list="pl-facings" />
                </F>
                <datalist id="pl-facings">
                  {["North", "North-east", "East", "South-east", "South", "South-west", "West", "North-west"].map((f) => (
                    <option key={f} value={f} />
                  ))}
                </datalist>
                <F id="pl-view" label="View">
                  <select id="pl-view" className="ad-input" value={draft.view} onChange={(e) => set("view", e.target.value)}>
                    <option value="">—</option>
                    <option>Sea</option>
                    <option>City</option>
                    <option>Garden</option>
                    <option>Hills</option>
                    <option>Lagoon</option>
                  </select>
                </F>
              </div>
            </section>

            <section className="ad-section">
              <div className="ad-section-head">
                <h5>Room dimensions</h5>
                <button type="button" className="ad-btn ad-btn-ghost" onClick={() => set("rooms", [...draft.rooms, { name: "", w: 0, l: 0 }])}>
                  <Plus size={15} />
                  Add room
                </button>
              </div>
              <div style={{ overflowX: "auto", padding: "4px 8px 8px" }}>
                <table className="ad-table" style={{ minWidth: 520 }}>
                  <thead>
                    <tr>
                      <th>Room</th>
                      <th style={{ width: 120 }}>Width ({unit})</th>
                      <th style={{ width: 120 }}>Length ({unit})</th>
                      <th className="r" style={{ width: 110 }}>
                        Area
                      </th>
                      <th style={{ width: 44 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {draft.rooms.map((r, i) => (
                      <tr key={i}>
                        <td>
                          <input className="ad-input" aria-label={`Room ${i + 1} name`} value={r.name} onChange={(e) => setRoom(i, { name: e.target.value })} aria-invalid={!!err[`room${i}`] || undefined} />
                          {err[`room${i}`] && (
                            <span className="ad-error">
                              <CircleAlert size={13} />
                              {err[`room${i}`]}
                            </span>
                          )}
                        </td>
                        <td>
                          <input key={`w${unit}`} className="ad-input" inputMode="decimal" aria-label={`Width of ${r.name || `room ${i + 1}`}`} defaultValue={show(r.w)} onBlur={(e) => setRoom(i, { w: read(e.target.value) })} />
                        </td>
                        <td>
                          <input key={`l${unit}`} className="ad-input" inputMode="decimal" aria-label={`Length of ${r.name || `room ${i + 1}`}`} defaultValue={show(r.l)} onBlur={(e) => setRoom(i, { l: read(e.target.value) })} />
                        </td>
                        <td className="r" style={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                          {area(r) ? areaLabel(area(r)) : "—"}
                        </td>
                        <td>
                          <button type="button" className="ad-btn ad-btn-icon" aria-label={`Remove ${r.name || `room ${i + 1}`}`} onClick={() => set("rooms", draft.rooms.filter((_, j) => j !== i))}>
                            <X size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className={s.saveBar}>
                <span className="ad-muted" style={{ fontSize: 12.5 }}>
                  Saved layouts update the project page, unit pages and building explorer straight away.
                </span>
                {dirty && cur && (
                  <button type="button" className="ad-btn ad-btn-ghost" onClick={() => setDraft(toDraft(cur))}>
                    Discard
                  </button>
                )}
                <button type="button" className="ad-btn ad-btn-primary" onClick={save} disabled={pending || (!dirty && !!cur)}>
                  {draft.id == null ? "Create layout" : "Save changes"}
                </button>
              </div>
            </section>
          </div>
        ) : (
          <div className="ad-empty" style={{ flex: 1 }}>
            <div className="ad-empty-icon">
              <MapIcon size={20} />
            </div>
            <h4>No layouts yet</h4>
            <button type="button" className="ad-btn ad-btn-primary" onClick={() => pick("new")}>
              <Plus size={16} />
              New layout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className={s.stat}>
      <div className="ad-kicker">{k}</div>
      <div style={{ fontWeight: 700, fontSize: 15 }}>{v}</div>
    </div>
  );
}

function F({ id, label, err, children }: { id: string; label: string; err?: string; children: React.ReactNode }) {
  return (
    <div className="ad-field">
      <label htmlFor={id}>{label}</label>
      {children}
      {err && (
        <span className="ad-error">
          <CircleAlert size={13} />
          {err}
        </span>
      )}
    </div>
  );
}
