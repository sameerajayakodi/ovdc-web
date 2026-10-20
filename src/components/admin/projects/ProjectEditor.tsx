"use client";

import Link from "next/link";
import { useEffect, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CircleAlert, ExternalLink, LayoutGrid, LoaderCircle, MapPin, Save, Trash2 } from "lucide-react";
import { deleteProject, saveProject } from "@/app/admin/actions";
import { useAdminUi } from "../AdminRoot";
import { STAGE_LABEL, dateTime, slugify } from "@/lib/admin/format";
import type { AdminProject } from "@/lib/admin/types";
import s from "./editor.module.css";

const TYPES = ["Apartments", "Luxury apartments", "Townhouses", "Villas", "Mixed-use"];
const SECTIONS = [
  ["basic", "Basic info"],
  ["status", "Status & pricing"],
  ["location", "Location"],
  ["website", "Website"],
] as const;

const BLANK: Omit<AdminProject, "updatedAt" | "inventory"> = {
  id: "",
  slug: "",
  name: "",
  loc: "",
  address: "",
  type: "Apartments",
  status: "soon",
  fromMn: null,
  tour: false,
  explorer: false,
  progress: 0,
  completion: "",
  uda: "",
  units: 0,
  floors: 0,
  towers: "",
  beds: "",
  availableManual: 0,
  lat: 6.9271,
  lng: 79.8612,
  blurb: "",
  published: false,
  featured: false,
  sort: 99,
};

export function ProjectEditor({ project, created = false }: { project: AdminProject | null; created?: boolean }) {
  const router = useRouter();
  const { toast, confirm } = useAdminUi();
  const isNew = project === null;
  const p = project ?? { ...BLANK, updatedAt: "", inventory: null };
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();
  const [name, setName] = useState(p.name);
  const [slugInput, setSlugInput] = useState("");
  const [blurb, setBlurb] = useState(p.blurb);
  const [stage, setStage] = useState(p.status);
  const [published, setPublished] = useState(p.published);

  useEffect(() => {
    if (created) toast("Project created as a draft. Fill in the details, then publish.");
  }, [created, toast]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const slugPreview = slugify(slugInput || name);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      try {
        const res = await saveProject(isNew ? null : p.slug, null, fd);
        if (!res.ok) {
          setErrors(res.fields ?? {});
          setFormError(res.error);
          toast(res.error, "err");
          const first = res.fields && Object.keys(res.fields)[0];
          if (first) document.getElementById(`pf-${first}`)?.focus();
          return;
        }
        setErrors({});
        setFormError(null);
        setDirty(false);
        toast(res.message ?? "Saved");
        router.refresh();
      } catch (err) {
        // redirect() after creating a project surfaces here as a navigation, not an error
        if (err && typeof err === "object" && "digest" in err && String((err as { digest: unknown }).digest).startsWith("NEXT_REDIRECT")) throw err;
        toast("Could not save. Check your connection and try again.", "err");
      }
    });
  }

  async function remove() {
    const ok = await confirm({
      title: `Delete ${p.name}?`,
      body: "This draft and any units attached to it are removed permanently. This cannot be undone.",
      confirmLabel: "Delete project",
      danger: true,
    });
    if (!ok) return;
    start(async () => {
      const res = await deleteProject(p.slug);
      if (res.ok) {
        setDirty(false);
        toast(res.message ?? "Deleted");
        router.push("/admin/projects");
      } else toast(res.error, "err");
    });
  }

  const err = (k: string) => (errors[k] ? { "aria-invalid": true as const, "aria-describedby": `pf-${k}-err` } : {});
  const fieldError = (k: string) =>
    errors[k] ? (
      <div id={`pf-${k}-err`} className="ad-error">
        <CircleAlert size={13} />
        {errors[k]}
      </div>
    ) : null;

  return (
    <form onSubmit={submit} onInput={() => setDirty(true)} className={s.wrap} noValidate>
      <div className={s.top}>
        <div className={s.topRow}>
          <Link href="/admin/projects" className="ad-btn ad-btn-icon ad-btn-secondary" aria-label="Back to projects">
            <ArrowLeft size={16} />
          </Link>
          <div style={{ flex: "1 1 200px", minWidth: 0 }}>
            <div className="ad-muted" style={{ fontSize: 12 }}>
              Projects / {isNew ? "New project" : "Edit"}
            </div>
            <div className={s.title}>{name || "Untitled project"}</div>
          </div>
          <span className={`ad-tag ${published ? "ad-tag-ok" : "ad-tag-neutral"}`}>{published ? "Live" : "Draft"}</span>
          {dirty && <span className="ad-tag ad-tag-warn">Unsaved changes</span>}
          {!isNew && (
            <a
              className="ad-btn ad-btn-secondary"
              href={p.published ? `/projects/${p.slug}` : undefined}
              aria-disabled={!p.published}
              target="_blank"
              rel="noreferrer"
              title={p.published ? "Open the live page" : "Publish the project to see it on the website"}
              style={p.published ? undefined : { opacity: 0.45, pointerEvents: "none" }}
            >
              <ExternalLink size={16} />
              View on ovdc.lk
            </a>
          )}
          <button className="ad-btn ad-btn-primary" disabled={pending}>
            {pending ? <LoaderCircle size={16} className="ad-spin" /> : <Save size={16} />}
            {isNew ? "Create project" : "Save changes"}
          </button>
        </div>
        <nav className={s.tabs} aria-label="Sections">
          {SECTIONS.map(([id, label]) => (
            <a key={id} href={`#${id}`}>
              {label}
            </a>
          ))}
        </nav>
      </div>

      {formError && (
        <div role="alert" className="ad-tag ad-tag-danger" style={{ margin: "16px 24px 0", padding: "10px 12px", fontSize: 13, whiteSpace: "normal" }}>
          <CircleAlert size={15} />
          {formError}
        </div>
      )}

      <div className={s.body}>
        <div className={s.main}>
          <Section id="basic" title="Basic info">
            <div className={s.grid}>
              <div className="ad-field" style={{ gridColumn: "1 / -1" }}>
                <label htmlFor="pf-name">Project name</label>
                <input id="pf-name" name="name" className="ad-input" defaultValue={p.name} onChange={(e) => setName(e.target.value)} required {...err("name")} />
                {fieldError("name")}
              </div>
              {isNew ? (
                <div className="ad-field" style={{ gridColumn: "1 / -1" }}>
                  <label htmlFor="pf-slug">
                    <span>Web address</span>
                    <span>ovdc.lk/projects/{slugPreview || "…"}</span>
                  </label>
                  <input id="pf-slug" name="slug" className="ad-input" placeholder={slugify(name) || "e.g. ocean-view-residences"} value={slugInput} onChange={(e) => setSlugInput(e.target.value)} {...err("slug")} />
                  <div className="ad-help">Leave empty to use the project name. It cannot be changed after the project is created.</div>
                  {fieldError("slug")}
                </div>
              ) : (
                <div className="ad-field" style={{ gridColumn: "1 / -1" }}>
                  <label htmlFor="pf-slug-ro">Web address</label>
                  <input id="pf-slug-ro" className="ad-input" value={`ovdc.lk/projects/${p.slug}`} readOnly />
                </div>
              )}
              <div className="ad-field">
                <label htmlFor="pf-type">Property type</label>
                <select id="pf-type" name="type" className="ad-input" defaultValue={p.type}>
                  {[...new Set([...TYPES, p.type])].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="ad-field">
                <label htmlFor="pf-uda">UDA approval no.</label>
                <input id="pf-uda" name="uda" className="ad-input" defaultValue={p.uda} placeholder="UDA/DC/2026/0000" />
              </div>
              <div className="ad-field">
                <label htmlFor="pf-towers">Towers</label>
                <input id="pf-towers" name="towers" className="ad-input" defaultValue={p.towers} placeholder="e.g. Tower A · Tower B" />
              </div>
              <div className="ad-field">
                <label htmlFor="pf-beds">Bedrooms</label>
                <input id="pf-beds" name="beds" className="ad-input" defaultValue={p.beds} placeholder="e.g. 2–4 Bed" />
              </div>
              <div className="ad-field">
                <label htmlFor="pf-floors">Floors</label>
                <input id="pf-floors" name="floors" type="number" min={0} className="ad-input" defaultValue={p.floors} {...err("floors")} />
                {fieldError("floors")}
              </div>
              <div className="ad-field">
                <label htmlFor="pf-units">Total units</label>
                <input id="pf-units" name="units" type="number" min={0} className="ad-input" defaultValue={p.units} {...err("units")} />
                {fieldError("units")}
              </div>
              <div className="ad-field" style={{ gridColumn: "1 / -1" }}>
                <label htmlFor="pf-blurb">
                  <span>Short description</span>
                  <span>{blurb.length} / 600</span>
                </label>
                <textarea id="pf-blurb" name="blurb" className="ad-input" maxLength={600} defaultValue={p.blurb} onChange={(e) => setBlurb(e.target.value)} />
                <div className="ad-help">Shown on project cards and at the top of the project page.</div>
              </div>
            </div>
          </Section>

          <Section id="status" title="Status & pricing">
            <div className={s.grid}>
              <div className="ad-field">
                <label htmlFor="pf-status">Stage</label>
                <select id="pf-status" name="status" className="ad-input" defaultValue={p.status} onChange={(e) => setStage(e.target.value as AdminProject["status"])} {...err("status")}>
                  {Object.entries(STAGE_LABEL).map(([k, l]) => (
                    <option key={k} value={k}>
                      {l}
                    </option>
                  ))}
                </select>
                {fieldError("status")}
              </div>
              <div className="ad-field">
                <label htmlFor="pf-completion">{stage === "done" ? "Completed" : "Expected completion"}</label>
                <input id="pf-completion" name="completion" className="ad-input" defaultValue={p.completion} placeholder="e.g. Dec 2027" />
              </div>
              <div className="ad-field">
                <label htmlFor="pf-progress">Construction progress (%)</label>
                <input id="pf-progress" name="progress" type="number" min={0} max={100} className="ad-input" defaultValue={p.progress} {...err("progress")} />
                {fieldError("progress")}
              </div>
              <div className="ad-field">
                <label htmlFor="pf-fromMn">Starting price (LKR Mn)</label>
                <input id="pf-fromMn" name="fromMn" inputMode="decimal" className="ad-input" defaultValue={p.fromMn ?? ""} placeholder="Empty = price on launch" {...err("fromMn")} />
                {fieldError("fromMn")}
              </div>
              {p.inventory ? (
                <div className="ad-field" style={{ gridColumn: "1 / -1" }}>
                  <span className="ad-label">Availability</span>
                  <div className="ad-muted" style={{ fontSize: 13 }}>
                    Calculated live from the unit inventory: <strong style={{ color: "var(--a-text)" }}>{p.inventory.A} available</strong> of {p.inventory.total}.{" "}
                    <Link href={`/admin/units?project=${p.slug}`}>Manage units</Link>
                  </div>
                  <input type="hidden" name="availableManual" value={p.availableManual} />
                </div>
              ) : (
                <div className="ad-field">
                  <label htmlFor="pf-availableManual">Homes available</label>
                  <input id="pf-availableManual" name="availableManual" type="number" min={0} className="ad-input" defaultValue={p.availableManual} {...err("availableManual")} />
                  <div className="ad-help">Shown on the website until unit inventory is added.</div>
                  {fieldError("availableManual")}
                </div>
              )}
            </div>
          </Section>

          <Section id="location" title="Location">
            <div className={s.grid}>
              <div className="ad-field">
                <label htmlFor="pf-loc">Area</label>
                <input id="pf-loc" name="loc" className="ad-input" defaultValue={p.loc} placeholder="e.g. Mount Lavinia" required {...err("loc")} />
                {fieldError("loc")}
              </div>
              <div className="ad-field">
                <label htmlFor="pf-address">Street address</label>
                <input id="pf-address" name="address" className="ad-input" defaultValue={p.address} placeholder="e.g. Galle Road, Mount Lavinia" />
              </div>
              <div className="ad-field">
                <label htmlFor="pf-lat">Latitude</label>
                <input id="pf-lat" name="lat" inputMode="decimal" className="ad-input" defaultValue={p.lat} {...err("lat")} />
                {fieldError("lat")}
              </div>
              <div className="ad-field">
                <label htmlFor="pf-lng">Longitude</label>
                <input id="pf-lng" name="lng" inputMode="decimal" className="ad-input" defaultValue={p.lng} {...err("lng")} />
                {fieldError("lng")}
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <a href={`https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=16/${p.lat}/${p.lng}`} target="_blank" rel="noreferrer" style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 13 }}>
                  <MapPin size={14} />
                  Check the saved pin on OpenStreetMap
                </a>
                <div className="ad-help">Tip: in Google Maps, right-click the site and click the coordinates to copy them.</div>
              </div>
            </div>
          </Section>

          <Section id="website" title="Website">
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Toggle name="tour" defaultChecked={p.tour} label="360° tour published" help="Shows the 3D tour badge and links for this project." />
              <Toggle
                name="explorer"
                defaultChecked={p.explorer}
                disabled={!p.inventory}
                label="Building explorer"
                help={p.inventory ? "Interactive floor-by-floor availability on the project page." : "Needs unit inventory before it can be switched on."}
                error={errors.explorer}
              />
              <div className="ad-field" style={{ maxWidth: 200 }}>
                <label htmlFor="pf-sort">Sort order</label>
                <input id="pf-sort" name="sort" type="number" min={0} className="ad-input" defaultValue={p.sort} {...err("sort")} />
                <div className="ad-help">Lower numbers are listed first.</div>
                {fieldError("sort")}
              </div>
            </div>
          </Section>
        </div>

        <aside className={s.side}>
          <section className="ad-section">
            <div className="ad-section-head">
              <h5>Publishing</h5>
            </div>
            <div className="ad-section-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Toggle
                name="published"
                defaultChecked={p.published}
                onChange={setPublished}
                label="Live on ovdc.lk"
                help={published ? "Visible in project lists, search and the sitemap." : "Draft · hidden from the website."}
              />
              <Toggle name="featured" defaultChecked={p.featured} label="Featured" help="Highlighted on the home page." />
              <button className="ad-btn ad-btn-primary ad-btn-split" disabled={pending}>
                {isNew ? "Create project" : "Save changes"}
                {pending ? <LoaderCircle size={16} className="ad-spin" /> : <Save size={16} />}
              </button>
              {!isNew && (
                <div className="ad-muted" style={{ fontSize: 12 }}>
                  Last updated {dateTime(p.updatedAt)}
                </div>
              )}
            </div>
          </section>

          {p.inventory && (
            <section className="ad-section">
              <div className="ad-section-head">
                <h5>Inventory</h5>
              </div>
              <div className="ad-section-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div className="ad-bar" style={{ height: 8 }}>
                  {(["A", "R", "S", "B"] as const).map((k) => (
                    <span key={k} className={`ad-st-${k}`} style={{ flex: p.inventory![k] }} />
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 12px", fontSize: 13 }}>
                  {(
                    [
                      ["A", "Available"],
                      ["R", "Reserved"],
                      ["S", "Sold"],
                      ["B", "Not released"],
                    ] as const
                  ).map(([k, l]) => (
                    <span key={k} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span className={`ad-st ad-st-${k}`} style={{ width: 10, height: 10 }} />
                      <span className="ad-muted">{l}</span>
                      <strong style={{ marginLeft: "auto" }}>{p.inventory![k]}</strong>
                    </span>
                  ))}
                </div>
                <Link href={`/admin/units?project=${p.slug}`} className="ad-btn ad-btn-secondary">
                  <LayoutGrid size={15} />
                  Manage units
                </Link>
              </div>
            </section>
          )}

          {!isNew && !p.published && (
            <section className="ad-section">
              <div className="ad-section-head">
                <h5>Danger zone</h5>
              </div>
              <div className="ad-section-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <p className="ad-muted" style={{ margin: 0, fontSize: 12.5 }}>
                  Drafts can be deleted. Live projects must be unpublished first.
                </p>
                <button type="button" className="ad-btn ad-btn-secondary" style={{ color: "var(--a-danger-text)" }} onClick={remove} disabled={pending}>
                  <Trash2 size={15} />
                  Delete draft
                </button>
              </div>
            </section>
          )}
        </aside>
      </div>
    </form>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="ad-section" style={{ scrollMarginTop: 120 }}>
      <div className="ad-section-head">
        <h5>{title}</h5>
      </div>
      <div className="ad-section-body">{children}</div>
    </section>
  );
}

function Toggle({
  name,
  label,
  help,
  defaultChecked,
  disabled,
  error,
  onChange,
}: {
  name: string;
  label: string;
  help?: string;
  defaultChecked: boolean;
  disabled?: boolean;
  error?: string;
  onChange?: (v: boolean) => void;
}) {
  return (
    <div>
      <label className="ad-switch" htmlFor={`pf-${name}`} style={{ alignItems: "flex-start" }}>
        <input id={`pf-${name}`} type="checkbox" name={name} defaultChecked={defaultChecked} disabled={disabled} onChange={(e) => onChange?.(e.target.checked)} />
        <span className="track" style={{ marginTop: 1 }} />
        <span>
          <span style={{ fontWeight: 600, display: "block" }}>{label}</span>
          {help && (
            <span className="ad-muted" style={{ fontSize: 12 }}>
              {help}
            </span>
          )}
        </span>
      </label>
      {error && (
        <div className="ad-error">
          <CircleAlert size={13} />
          {error}
        </div>
      )}
    </div>
  );
}
