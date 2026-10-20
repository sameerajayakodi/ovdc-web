"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, Download, Minus, Pencil, Plus, Search, SearchX, Trash2 } from "lucide-react";
import { deleteProject } from "@/app/admin/actions";
import { useAdminUi } from "../AdminRoot";
import { STAGE_LABEL, ago, dateTime, downloadCsv, lkr } from "@/lib/admin/format";
import type { AdminProject } from "@/lib/admin/types";

type Vis = "all" | "live" | "draft";

export function sold(p: AdminProject) {
  return p.inventory ? { taken: p.inventory.S + p.inventory.R, total: p.inventory.total } : { taken: Math.max(0, p.units - p.availableManual), total: p.units };
}

export function ProjectsTable({
  projects,
  thumbs,
  initialQuery,
  now,
}: {
  projects: AdminProject[];
  thumbs: Record<string, string | null>;
  initialQuery: string;
  /** Server time, so "updated 3 h ago" renders the same on server and client */
  now: number;
}) {
  const router = useRouter();
  const { toast, confirm } = useAdminUi();
  const [q, setQ] = useState(initialQuery);
  const [vis, setVis] = useState<Vis>("all");
  const [loc, setLoc] = useState("all");
  const [stage, setStage] = useState("all");
  const [pending, start] = useTransition();
  const locations = useMemo(() => [...new Set(projects.map((p) => p.loc))].sort(), [projects]);

  const rows = projects.filter((p) => {
    const t = q.trim().toLowerCase();
    return (
      (!t || `${p.name} ${p.loc} ${p.uda} ${p.slug}`.toLowerCase().includes(t)) &&
      (vis === "all" || (vis === "live") === p.published) &&
      (loc === "all" || p.loc === loc) &&
      (stage === "all" || p.status === stage)
    );
  });
  const live = projects.filter((p) => p.published).length;
  const clear = () => {
    setQ("");
    setVis("all");
    setLoc("all");
    setStage("all");
  };

  async function remove(p: AdminProject) {
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
        toast(res.message ?? "Deleted");
        router.refresh();
      } else toast(res.error, "err");
    });
  }

  function exportCsv() {
    downloadCsv(`ovdc-projects-${new Date().toISOString().slice(0, 10)}.csv`, [
      ["slug", "name", "location", "type", "stage", "from_lkr_mn", "units", "sold_or_reserved", "available", "progress_pct", "completion", "uda", "published", "featured", "tour", "explorer", "updated_at"],
      ...projects.map((p) => {
        const s = sold(p);
        return [p.slug, p.name, p.loc, p.type, STAGE_LABEL[p.status], p.fromMn, p.units, s.taken, p.inventory?.A ?? p.availableManual, p.progress, p.completion, p.uda, p.published ? "yes" : "no", p.featured ? "yes" : "no", p.tour ? "yes" : "no", p.explorer ? "yes" : "no", p.updatedAt];
      }),
    ]);
  }

  return (
    <div className="ad-page" style={{ gap: 16 }}>
      <div className="ad-page-head">
        <div>
          <h1>Projects</h1>
          <div className="ad-sub">
            {projects.length} projects · {live} live on ovdc.lk · {projects.length - live} draft{projects.length - live === 1 ? "" : "s"}
          </div>
        </div>
        <button type="button" className="ad-btn ad-btn-secondary" onClick={exportCsv}>
          <Download size={16} />
          Export CSV
        </button>
        <Link href="/admin/projects/new" className="ad-btn ad-btn-primary">
          <Plus size={16} />
          New project
        </Link>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", padding: "10px 0", borderTop: "2px solid var(--a-divider)", borderBottom: "1px solid var(--a-divider)" }}>
        <div className="ad-search" style={{ flex: "1 1 240px", maxWidth: 340 }}>
          <Search size={16} />
          <input className="ad-input" aria-label="Search projects" placeholder="Search name, location or UDA no." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="ad-seg" role="group" aria-label="Visibility">
          {(
            [
              ["all", "All"],
              ["live", "Live"],
              ["draft", "Draft"],
            ] as const
          ).map(([k, l]) => (
            <button key={k} type="button" aria-pressed={vis === k} onClick={() => setVis(k)}>
              {l}
            </button>
          ))}
        </div>
        <select className="ad-input" aria-label="Location" style={{ width: 180 }} value={loc} onChange={(e) => setLoc(e.target.value)}>
          <option value="all">All locations</option>
          {locations.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
        <select className="ad-input" aria-label="Stage" style={{ width: 200 }} value={stage} onChange={(e) => setStage(e.target.value)}>
          <option value="all">Any stage</option>
          {Object.entries(STAGE_LABEL).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
      </div>

      {rows.length ? (
        <div style={{ overflowX: "auto" }}>
          <table className="ad-table" style={{ minWidth: 1020 }} aria-busy={pending}>
            <thead>
              <tr>
                <th style={{ width: 64 }}>
                  <span className="ad-sr">Photo</span>
                </th>
                <th>Project</th>
                <th>Type</th>
                <th style={{ width: 170 }}>Sold / reserved</th>
                <th>From</th>
                <th>Stage</th>
                <th>Visibility</th>
                <th>360° tour</th>
                <th>Updated</th>
                <th style={{ width: 84 }}>
                  <span className="ad-sr">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const s = sold(p);
                const pct = s.total ? Math.round((s.taken / s.total) * 100) : 0;
                return (
                  <tr key={p.slug} onClick={() => router.push(`/admin/projects/${p.slug}`)} style={{ cursor: "pointer" }}>
                    <td>
                      {thumbs[p.slug] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumbs[p.slug]!} alt="" width={52} height={38} style={{ width: 52, height: 38, objectFit: "cover", display: "block" }} loading="lazy" />
                      ) : (
                        <span style={{ width: 52, height: 38, display: "grid", placeItems: "center", background: "var(--a-n200)" }}>
                          <Building2 size={16} />
                        </span>
                      )}
                    </td>
                    <td>
                      <Link href={`/admin/projects/${p.slug}`} style={{ fontWeight: 600, color: "var(--a-text)", textDecoration: "none" }} onClick={(e) => e.stopPropagation()}>
                        {p.name}
                      </Link>
                      <div className="ad-muted" style={{ fontSize: 12 }}>
                        {p.loc}
                        {p.uda ? ` · ${p.uda}` : ""}
                      </div>
                    </td>
                    <td>{p.type}</td>
                    <td>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                        <span>
                          {s.taken} / {s.total}
                        </span>
                        <span className="ad-muted">{pct}%</span>
                      </div>
                      <div className="ad-meter">
                        <span style={{ width: `${pct}%` }} />
                      </div>
                      {!p.inventory && (
                        <div className="ad-muted" style={{ fontSize: 11, marginTop: 3 }}>
                          manual count
                        </div>
                      )}
                    </td>
                    <td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{p.fromMn != null ? lkr(p.fromMn) : <span className="ad-muted">On launch</span>}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {STAGE_LABEL[p.status]}
                      {p.status === "uc" && (
                        <div className="ad-muted" style={{ fontSize: 12 }}>
                          {p.progress}% built
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`ad-tag ${p.published ? "ad-tag-ok" : "ad-tag-neutral"}`}>{p.published ? "Live" : "Draft"}</span>
                      {p.featured && (
                        <div className="ad-gold" style={{ fontSize: 11, marginTop: 4, fontWeight: 600 }}>
                          Featured
                        </div>
                      )}
                    </td>
                    <td>
                      <span style={{ display: "flex", alignItems: "center", gap: 6, color: p.tour ? "var(--a-ok-text)" : "var(--a-muted)" }}>
                        {p.tour ? <Check size={15} /> : <Minus size={15} />}
                        {p.tour ? "Published" : "None"}
                      </span>
                    </td>
                    <td className="ad-muted" style={{ fontSize: 12, whiteSpace: "nowrap" }} title={dateTime(p.updatedAt)}>
                      {ago(p.updatedAt, now)}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: "flex", gap: 2 }}>
                        <Link href={`/admin/projects/${p.slug}`} className="ad-btn ad-btn-icon" style={{ width: 32, height: 32 }} aria-label={`Edit ${p.name}`}>
                          <Pencil size={15} />
                        </Link>
                        <button
                          type="button"
                          className="ad-btn ad-btn-icon"
                          style={{ width: 32, height: 32, color: p.published ? undefined : "var(--a-danger-text)" }}
                          aria-label={`Delete ${p.name}`}
                          title={p.published ? "Unpublish the project before deleting it" : "Delete draft"}
                          disabled={p.published || pending}
                          onClick={() => remove(p)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="ad-empty">
          <div className="ad-empty-icon">
            <SearchX size={20} />
          </div>
          <h4>No projects match these filters</h4>
          <p className="ad-muted" style={{ margin: 0, maxWidth: 420, fontSize: 13.5 }}>
            Try a different search or clear the filters to see all {projects.length} projects.
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <button type="button" className="ad-btn ad-btn-secondary" onClick={clear}>
              Clear filters
            </button>
            <Link href="/admin/projects/new" className="ad-btn ad-btn-primary">
              <Plus size={16} />
              New project
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
