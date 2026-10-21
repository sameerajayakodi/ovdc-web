"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { setHrStage } from "@/app/admin/content-actions";
import type { HrStage } from "@/db/schema";
import { useAdminUi } from "../AdminRoot";
import { HR_STAGES } from "@/lib/admin/content";
import { ago } from "@/lib/admin/format";
import { ListEditor, type Field } from "./ListEditor";
import type { AdminJob, Application } from "./ContentConsole";
import s from "./content.module.css";

const JOB_FIELDS: Field[] = [
  { key: "title", label: "Job title", kind: "text", grow: true },
  { key: "team", label: "Team", kind: "text", width: 160 },
  { key: "location", label: "Location", kind: "text", width: 200 },
  { key: "type", label: "Type", kind: "text", width: 130, placeholder: "Full-time" },
  { key: "closes", label: "Closes", kind: "date", width: 160 },
  { key: "summary", label: "Summary", kind: "textarea", full: true },
  { key: "duties", label: "What you'll do", kind: "lines", grow: true },
  { key: "needs", label: "What you'll need", kind: "lines", grow: true },
  { key: "open", label: "Open", kind: "switch" },
];

export function Careers({ jobs, apps, now }: { jobs: AdminJob[]; apps: Application[]; now: number }) {
  const { toast } = useAdminUi();
  const [role, setRole] = useState("all");
  const [stageF, setStageF] = useState<HrStage | "all">("all");
  const [, start] = useTransition();
  const [list, patch] = useOptimistic(apps, (cur: Application[], p: { id: number; stage: HrStage }) => cur.map((a) => (a.id === p.id ? { ...a, stage: p.stage } : a)));
  const roles = [...new Set(list.map((a) => a.role).filter(Boolean))];
  const shown = list.filter((a) => (role === "all" || a.role === role) && (stageF === "all" || a.stage === stageF));

  function change(a: Application, stage: HrStage) {
    start(async () => {
      patch({ id: a.id, stage });
      const r = await setHrStage(a.id, stage);
      toast(r.ok ? (r.message ?? "Saved") : r.error, r.ok ? "ok" : "err");
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <ListEditor
        kind="jobs"
        title="Careers"
        sub="Open roles on the Careers page · closed or past-closing roles are hidden"
        rows={jobs.map(({ slug, title, team, location, type, summary, duties, needs, closes, open }) => ({ slug, title, team, location, type, summary, duties, needs, closes, open }))}
        fields={JOB_FIELDS}
        blank={{ slug: "", title: "", team: "", location: "", type: "Full-time", summary: "", duties: [], needs: [], closes: "", open: true }}
        heading={(r) => String(r.title || "New role")}
        viewHref="/careers"
        aside={(r) =>
          r.slug && r.open !== false ? (
            <a className="ad-btn ad-btn-ghost ad-btn-sm" href={`/careers/${r.slug}`} target="_blank" rel="noreferrer">
              <ExternalLink size={13} />
              Live page
            </a>
          ) : null
        }
      />

      <section className="ad-section" aria-label="Applications">
        <div className="ad-section-head">
          <h5>Applications · {list.length}</h5>
          <select className="ad-input" aria-label="Filter by role" style={{ width: 240 }} value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="all">All roles</option>
            {roles.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
          <select className="ad-input" aria-label="Filter by stage" style={{ width: 160 }} value={stageF} onChange={(e) => setStageF(e.target.value as HrStage | "all")}>
            <option value="all">All stages</option>
            {HR_STAGES.map((x) => (
              <option key={x.k} value={x.k}>
                {x.label}
              </option>
            ))}
          </select>
        </div>
        {shown.length ? (
          <div style={{ overflowX: "auto", padding: "4px 8px 8px" }}>
            <table className="ad-table" style={{ minWidth: 820 }}>
              <thead>
                <tr>
                  <th>Applicant</th>
                  <th>Role</th>
                  <th>Received</th>
                  <th>Profile</th>
                  <th>Stage</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <strong>{a.name || "—"}</strong>
                      <div className="ad-muted" style={{ fontSize: 11.5 }}>
                        {[a.email, a.mobile].filter(Boolean).join(" · ")}
                      </div>
                      {a.message && <div className={s.excerpt}>{a.message}</div>}
                    </td>
                    <td>{a.role || "—"}</td>
                    <td className="ad-muted" style={{ whiteSpace: "nowrap" }}>
                      {ago(a.createdAt, now)}
                    </td>
                    <td>
                      {a.url ? (
                        <a href={/^https?:\/\//.test(a.url) ? a.url : `https://${a.url}`} target="_blank" rel="noreferrer noopener">
                          Open link
                        </a>
                      ) : (
                        <span className="ad-muted">CV by email</span>
                      )}
                    </td>
                    <td>
                      <select className="ad-input" aria-label={`Stage for ${a.name}`} value={a.stage} onChange={(e) => change(a, e.target.value as HrStage)} style={{ width: 150 }} data-stage-hr={a.stage}>
                        {HR_STAGES.map((x) => (
                          <option key={x.k} value={x.k}>
                            {x.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="ad-muted" style={{ padding: 16, margin: 0 }}>
            {list.length ? "No applications match these filters." : "Applications sent from the Careers pages appear here."}{" "}
            <Link href="/admin/leads">All website forms are also in Leads.</Link>
          </p>
        )}
      </section>
    </div>
  );
}
