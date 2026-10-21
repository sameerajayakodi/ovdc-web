"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { CircleAlert, FileText, MessageCircle, Pencil, Phone, Search, Trash2, Upload } from "lucide-react";
import { deleteDocument, prepareDocument, saveDocument, updateCustomer, type CustomerPatch, type DocUpload } from "@/app/admin/customer-actions";
import { initials, waNumber } from "@/lib/admin/crm";
import { dateShort, lkr } from "@/lib/admin/format";
import { DOC_ACCEPT, type AdminCustomer, type AdminCustomerRow } from "@/lib/admin/customers";
import { STATUS_LABEL, isOverdue, paidTotal, rs } from "@/lib/admin/sales";
import { useAdminUi } from "../AdminRoot";
import s from "./customers.module.css";

const ymdLabel = (ymd: string) => new Date(`${ymd}T00:00:00Z`).toLocaleDateString("en-GB", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });
const size = (b: number) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

interface Props {
  list: AdminCustomerRow[];
  current: AdminCustomer | null;
  today: string;
  uploads: boolean;
  q: string;
}

export function CustomersConsole({ list, current, today, uploads, q: q0 }: Props) {
  const [q, setQ] = useState(q0);
  const ql = q.trim().toLowerCase();
  const digits = ql.replace(/\D/g, "");
  const shown = list.filter((c) => !ql || `${c.name} ${c.email} ${c.units.join(" ")}`.toLowerCase().includes(ql) || (digits.length >= 3 && `${c.nic} ${c.mobile}`.replace(/\D/g, "").includes(digits)));
  const owners = list.filter((c) => c.units.length).length;
  const unitsN = list.reduce((n, c) => n + c.units.length, 0);

  return (
    <div className={s.page}>
      <div className="ad-page-head">
        <div>
          <h1>Customers</h1>
          <div className="ad-sub">
            {list.length} customer{list.length === 1 ? "" : "s"} · {owners} holding {unitsN} unit{unitsN === 1 ? "" : "s"}
          </div>
        </div>
        <div className="ad-search" style={{ width: 280 }}>
          <Search size={15} />
          <input className="ad-input" aria-label="Search customers" placeholder="Name, NIC, phone or unit" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <div className={s.split}>
        <aside className={s.list} aria-label="Customers">
          <ul>
            {shown.map((c) => (
              <li key={c.id}>
                <Link href={`/admin/customers?c=${c.id}${q ? `&q=${encodeURIComponent(q)}` : ""}`} scroll={false} className={s.item} aria-current={current?.id === c.id || undefined}>
                  <span className={s.ini}>{initials(c.name)}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <strong className={s.name}>{c.name}</strong>
                    <span className={s.sub}>{c.units.length ? c.units.join(", ") : c.mobile || "No unit yet"}</span>
                  </span>
                  {c.overdue && <span className="ad-tag ad-tag-danger">Overdue</span>}
                </Link>
              </li>
            ))}
            {!shown.length && (
              <li className="ad-muted" style={{ padding: 16, fontSize: 13 }}>
                {list.length ? "No customers match." : "Customers are added when you reserve a unit for a lead in Reservations & sales."}
              </li>
            )}
          </ul>
        </aside>
        {current ? (
          <Detail key={current.id} c={current} today={today} uploads={uploads} />
        ) : (
          <div className="ad-empty" style={{ flex: "1 1 600px" }}>
            <strong>No customers yet</strong>
            <span className="ad-muted">
              Reserve a unit for a lead in <Link href="/admin/sales">Reservations &amp; sales</Link> and the buyer appears here.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function Detail({ c, today, uploads }: { c: AdminCustomer; today: string; uploads: boolean }) {
  const { toast, confirm } = useAdminUi();
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState<CustomerPatch>({ name: c.name, nic: c.nic, mobile: c.mobile, email: c.email, address: c.address, notes: c.notes });
  const [err, setErr] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState<number | null>(null);
  const [pending, start] = useTransition();
  const file = useRef<HTMLInputElement>(null);
  const tel = c.mobile.replace(/[^\d+]/g, "");
  const open = c.reservations.filter((r) => r.status === "reserved" || r.status === "sold");
  const history = c.reservations
    .flatMap((r) => r.payments.filter((p) => p.receiptNo || isOverdue(p, today)).map((p) => ({ r, p })))
    .sort((a, b) => (b.p.paidAt || b.p.dueDate).localeCompare(a.p.paidAt || a.p.dueDate));

  function save() {
    start(async () => {
      try {
        const r = await updateCustomer(c.id, form);
        if (!r.ok) {
          setErr(r.fields ?? {});
          return toast(r.error, "err");
        }
        setErr({});
        setEdit(false);
        toast(r.message ?? "Saved");
      } catch {
        toast("Could not save. Check your connection and try again.", "err");
      }
    });
  }

  async function upload(f: File) {
    const ticket = await prepareDocument(c.id, { name: f.name, size: f.size, type: f.type });
    if (!ticket.ok) return toast(ticket.error, "err");
    const body = new FormData();
    for (const [k, v] of Object.entries(ticket.data!.fields)) body.append(k, v);
    body.append("file", f);
    setProgress(0);
    try {
      const res = await new Promise<DocUpload>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", ticket.data!.url);
        xhr.upload.onprogress = (e) => e.lengthComputable && setProgress(Math.round((e.loaded / e.total) * 100));
        xhr.onload = () => {
          let j: { error?: { message?: string } } & Partial<DocUpload> = {};
          try {
            j = JSON.parse(xhr.responseText);
          } catch {}
          if (xhr.status >= 200 && xhr.status < 300 && j.public_id) resolve(j as DocUpload);
          else reject(new Error(j.error?.message ?? `Upload failed (${xhr.status})`));
        };
        xhr.onerror = () => reject(new Error("Upload failed. Check your connection."));
        xhr.send(body);
      });
      const saved = await saveDocument(c.id, res, f.name);
      toast(saved.ok ? (saved.message ?? "Uploaded") : saved.error, saved.ok ? "ok" : "err");
    } catch (e) {
      toast(`${f.name}: ${e instanceof Error ? e.message : "upload failed"}`, "err");
    } finally {
      setProgress(null);
    }
  }

  const input = (k: keyof CustomerPatch, label: string, extra: React.ComponentProps<"input"> = {}) => (
    <div className="ad-field">
      <label htmlFor={`cu-${k}`}>{label}</label>
      <input id={`cu-${k}`} className="ad-input" value={form[k]} onChange={(e) => setForm((x) => ({ ...x, [k]: e.target.value }))} aria-invalid={!!err[k] || undefined} {...extra} />
      {err[k] && (
        <span className="ad-error">
          <CircleAlert size={13} />
          {err[k]}
        </span>
      )}
    </div>
  );

  return (
    <div className={s.detail}>
      <section className="ad-section">
        <div className={s.head}>
          <div className={s.avatar}>{initials(c.name)}</div>
          <div style={{ flex: "1 1 240px", minWidth: 0 }}>
            <div className={s.title}>{c.name}</div>
            <div className="ad-muted" style={{ fontSize: 13 }}>
              Customer since {dateShort(c.createdAt)}
              {c.nic && <> · NIC {c.nic}</>}
            </div>
            <div style={{ fontSize: 13, marginTop: 4 }}>{[c.mobile, c.email].filter(Boolean).join(" · ") || <span className="ad-muted">No contact details</span>}</div>
            {c.address && (
              <div className="ad-muted" style={{ fontSize: 13 }}>
                {c.address}
              </div>
            )}
            {c.leadId && (
              <Link href={`/admin/leads?lead=${c.leadId}`} style={{ fontSize: 12.5 }}>
                Open the original lead
              </Link>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {tel && (
              <a className="ad-btn ad-btn-secondary" href={`tel:${tel}`}>
                <Phone size={15} />
                Call
              </a>
            )}
            {c.mobile && (
              <a className="ad-btn ad-btn-secondary" href={`https://wa.me/${waNumber(c.mobile)}`} target="_blank" rel="noreferrer">
                <MessageCircle size={15} />
                WhatsApp
              </a>
            )}
            {!edit && (
              <button type="button" className="ad-btn ad-btn-secondary" onClick={() => setEdit(true)}>
                <Pencil size={15} />
                Edit
              </button>
            )}
          </div>
        </div>

        {edit && (
          <div className={s.form}>
            <div className={s.grid}>
              {input("name", "Full name")}
              {input("nic", "NIC", { placeholder: "200012345678" })}
              {input("mobile", "Mobile", { type: "tel" })}
              {input("email", "Email", { type: "email" })}
              <div className="ad-field" style={{ gridColumn: "1 / -1" }}>
                <label htmlFor="cu-address">Postal address</label>
                <input id="cu-address" className="ad-input" value={form.address} onChange={(e) => setForm((x) => ({ ...x, address: e.target.value }))} />
              </div>
              <div className="ad-field" style={{ gridColumn: "1 / -1" }}>
                <label htmlFor="cu-notes">Internal notes</label>
                <textarea id="cu-notes" className="ad-input" style={{ minHeight: 64 }} value={form.notes} onChange={(e) => setForm((x) => ({ ...x, notes: e.target.value }))} placeholder="Bank loan, preferred contact time, family members on the deed" />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                type="button"
                className="ad-btn ad-btn-secondary"
                onClick={() => {
                  setEdit(false);
                  setErr({});
                  setForm({ name: c.name, nic: c.nic, mobile: c.mobile, email: c.email, address: c.address, notes: c.notes });
                }}
              >
                Cancel
              </button>
              <button type="button" className="ad-btn ad-btn-primary" disabled={pending} onClick={save}>
                {pending ? "Saving…" : "Save customer"}
              </button>
            </div>
          </div>
        )}
        {!edit && c.notes && <div className={s.notes}>{c.notes}</div>}

        <div style={{ padding: "14px 16px" }}>
          <div className="ad-kicker" style={{ marginBottom: 10 }}>
            Units
          </div>
          {c.reservations.length ? (
            <div className={s.units}>
              {c.reservations.map((r) => {
                const paid = paidTotal(r);
                const pct = Math.round((paid / (r.priceMn * 1e6)) * 100);
                const od = r.payments.some((p) => isOverdue(p, today));
                return (
                  <Link key={r.id} href={`/admin/sales?r=${r.id}`} className={s.unit} data-closed={!open.includes(r) || undefined}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span className={s.badge} data-s={r.status}>
                        {r.status === "sold" ? "S" : r.status === "reserved" ? "R" : "–"}
                      </span>
                      <strong style={{ fontSize: 13.5 }}>
                        {r.unit.projectName} · {r.unit.code}
                      </strong>
                    </div>
                    <div className="ad-muted" style={{ fontSize: 12 }}>
                      Tower {r.unit.tower} · Level {r.unit.floor} · {r.unit.label} · {r.unit.sqft.toLocaleString("en-GB")} sqft
                    </div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 2 }}>{lkr(r.priceMn)}</div>
                    <div className="ad-meter" style={{ marginTop: 6 }}>
                      <span style={{ width: `${Math.min(100, pct)}%`, background: "var(--a-available)" }} />
                    </div>
                    <div style={{ fontSize: 11.5, marginTop: 2, color: od ? "var(--a-danger-text)" : "var(--a-muted)" }}>
                      {pct}% paid · {od ? "instalment overdue" : STATUS_LABEL[r.status]}
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="ad-muted" style={{ margin: 0, fontSize: 13 }}>
              No units yet.
            </p>
          )}
        </div>
      </section>

      <div className={s.cols}>
        <section className="ad-section" style={{ flex: "1.4 1 380px" }} aria-label="Payment history">
          <div className="ad-section-head">
            <h5>Payment history</h5>
          </div>
          {history.length ? (
            <div style={{ overflowX: "auto", padding: "4px 8px 8px" }}>
              <table className="ad-table" style={{ fontSize: 13 }}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Milestone</th>
                    <th>Method</th>
                    <th className="r">Amount</th>
                    <th>Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(({ r, p }) => (
                    <tr key={p.id} style={p.receiptNo ? undefined : { background: "var(--a-danger-bg)" }}>
                      <td style={{ whiteSpace: "nowrap" }}>{p.receiptNo ? ymdLabel(p.paidAt) : "—"}</td>
                      <td>
                        {p.milestone}
                        <div className="ad-muted" style={{ fontSize: 11.5 }}>
                          Unit {r.unit.code}
                        </div>
                      </td>
                      <td className="ad-muted">{p.receiptNo ? p.method : `Due ${ymdLabel(p.dueDate)}`}</td>
                      <td className="r" style={{ fontWeight: 600, whiteSpace: "nowrap", color: p.receiptNo ? undefined : "var(--a-danger-text)" }}>
                        {rs(p.receiptNo ? p.paidAmount : p.amount)}
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {p.receiptNo && (
                          <a href={`/admin/receipt/${p.id}`} target="_blank" rel="noreferrer">
                            {p.receiptNo}
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="ad-muted" style={{ padding: 16, margin: 0, fontSize: 13 }}>
              No payments recorded yet.
            </p>
          )}
        </section>

        <section className="ad-section" style={{ flex: "1 1 280px" }} aria-label="Documents">
          <div className="ad-section-head">
            <h5>Documents</h5>
            {uploads && (
              <>
                <input
                  ref={file}
                  type="file"
                  accept={DOC_ACCEPT}
                  hidden
                  aria-label="Upload document"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (f) void upload(f);
                  }}
                />
                <button type="button" className="ad-btn ad-btn-ghost ad-btn-sm" disabled={progress != null} onClick={() => file.current?.click()}>
                  <Upload size={14} />
                  {progress != null ? `Uploading ${progress}%` : "Upload"}
                </button>
              </>
            )}
          </div>
          {c.documents.map((d) => (
            <div key={d.id} className="ad-row" style={{ fontSize: 13 }}>
              <FileText size={16} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <a href={`/admin/document/${d.id}`} className={s.docName}>
                  {d.name}
                </a>
                <div className="ad-muted" style={{ fontSize: 11.5 }}>
                  {[d.format.toUpperCase(), size(d.bytes), `${d.uploadedBy} · ${dateShort(d.createdAt)}`].filter(Boolean).join(" · ")}
                </div>
              </div>
              <button
                type="button"
                className="ad-btn ad-btn-icon"
                aria-label={`Delete ${d.name}`}
                disabled={pending}
                onClick={async () => {
                  if (!(await confirm({ danger: true, title: `Delete ${d.name}?`, body: "The file is removed from storage and cannot be restored.", confirmLabel: "Delete" }))) return;
                  start(async () => {
                    const r = await deleteDocument(d.id);
                    toast(r.ok ? (r.message ?? "Deleted") : r.error, r.ok ? "ok" : "err");
                  });
                }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          <p className="ad-muted" style={{ padding: "10px 16px 14px", margin: 0, fontSize: 12 }}>
            {uploads
              ? `${c.documents.length ? "" : "NIC copies, signed agreements and bank letters. "}Files are private: each download is a signed link that expires in 5 minutes.`
              : "Uploads need Cloudinary keys (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)."}
          </p>
        </section>
      </div>
    </div>
  );
}
