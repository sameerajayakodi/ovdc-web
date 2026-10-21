"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { convertToLead } from "@/app/admin/content-actions";
import type { LeadKind } from "@/db/schema";
import { useAdminUi } from "../AdminRoot";
import { KIND_LABEL, SALES_KINDS } from "@/lib/admin/crm";
import { ago, dateTime } from "@/lib/admin/format";
import type { FormRow } from "./ContentConsole";
import s from "./content.module.css";

/** Every website form submission. Spam is dropped before it is stored (honeypot + per-IP limit). */
export function Forms({ forms, now }: { forms: FormRow[]; now: number }) {
  const { toast } = useAdminUi();
  const [kind, setKind] = useState<LeadKind | "all">("all");
  const [done, setDone] = useState<number[]>([]);
  const [pending, start] = useTransition();
  const shown = forms.filter((f) => kind === "all" || f.kind === kind);
  const kinds = [...new Set(forms.map((f) => f.kind))];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="ad-page-head">
        <div>
          <h1>Form submissions</h1>
          <div className="ad-sub">Latest {forms.length} from ovdc.lk · spam is filtered out before it is stored</div>
        </div>
        <select className="ad-input" aria-label="Form" style={{ width: 220 }} value={kind} onChange={(e) => setKind(e.target.value as LeadKind | "all")}>
          <option value="all">All forms</option>
          {kinds.map((k) => (
            <option key={k} value={k}>
              {KIND_LABEL[k]}
            </option>
          ))}
        </select>
      </div>
      <section className="ad-section">
        {shown.length ? (
          <div style={{ overflowX: "auto", padding: "4px 8px 8px" }}>
            <table className="ad-table" style={{ minWidth: 860 }}>
              <thead>
                <tr>
                  <th>Received</th>
                  <th>Form</th>
                  <th>From</th>
                  <th>Message</th>
                  <th>Spam check</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {shown.map((f) => {
                  const sales = SALES_KINDS.includes(f.kind) || done.includes(f.id);
                  return (
                    <tr key={f.id}>
                      <td className="ad-muted" style={{ whiteSpace: "nowrap" }} title={dateTime(f.createdAt)}>
                        {ago(f.createdAt, now)}
                      </td>
                      <td>
                        {KIND_LABEL[f.kind]}
                        <div className="ad-muted" style={{ fontSize: 11.5 }}>
                          {f.page || "—"}
                        </div>
                      </td>
                      <td>
                        <strong>{f.name || "—"}</strong>
                        <div className="ad-muted" style={{ fontSize: 11.5 }}>
                          {[f.email, f.mobile].filter(Boolean).join(" · ")}
                        </div>
                      </td>
                      <td>
                        <div className={s.excerpt}>{f.message || f.interest || "—"}</div>
                      </td>
                      <td>
                        <span className="ad-tag ad-tag-ok">Passed</span>
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {sales ? (
                          <Link href={`/admin/leads?lead=${f.id}`} className="ad-btn ad-btn-ghost ad-btn-sm">
                            Open lead
                          </Link>
                        ) : (
                          <button
                            type="button"
                            className="ad-btn ad-btn-secondary ad-btn-sm"
                            disabled={pending}
                            onClick={() =>
                              start(async () => {
                                const r = await convertToLead(f.id);
                                toast(r.ok ? (r.message ?? "Converted") : r.error, r.ok ? "ok" : "err");
                                if (r.ok) setDone((d) => [...d, f.id]);
                              })
                            }
                          >
                            Convert to lead
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="ad-muted" style={{ padding: 16, margin: 0 }}>
            No form submissions yet.
          </p>
        )}
      </section>
    </div>
  );
}
