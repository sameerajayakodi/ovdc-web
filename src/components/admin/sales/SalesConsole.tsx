"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { CircleAlert, CircleCheck, CircleDot, Circle, Download, FileDown, Plus, Timer, Undo2 } from "lucide-react";
import { extendHold, markSold, releaseReservation, setAgreementStep, setDueDate, voidPayment } from "@/app/admin/sales-actions";
import { ymdOf } from "@/lib/admin/crm";
import { dateShort, downloadCsv, lkr } from "@/lib/admin/format";
import { AGREEMENT, EXTEND_DAYS, PLAN_LABEL, STATUS_LABEL, isOverdue, paidTotal, rs, rsMn, type AdminPayment, type AdminReservation, type UnitOption } from "@/lib/admin/sales";
import { useAdminUi } from "../AdminRoot";
import { NewReservationDialog, type LeadOption } from "./NewReservationDialog";
import { PaymentDialog } from "./PaymentDialog";
import s from "./sales.module.css";

type Tab = "res" | "sale" | "alert" | "closed";
const TABS: { k: Tab; label: string }[] = [
  { k: "res", label: "Reservations" },
  { k: "sale", label: "Sales" },
  { k: "alert", label: "Needs action" },
  { k: "closed", label: "Closed" },
];
const DAY = 86_400_000;

const ymdLabel = (ymd: string) => new Date(`${ymd}T00:00:00Z`).toLocaleDateString("en-GB", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY);

function left(ms: number) {
  if (ms <= 0) return "Expired";
  const t = Math.floor(ms / 1000);
  const d = Math.floor(t / 86400);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d ? `${d}d ` : ""}${p(Math.floor((t % 86400) / 3600))}h ${p(Math.floor((t % 3600) / 60))}m ${p(t % 60)}s`;
}

function payStatus(p: AdminPayment, today: string) {
  if (p.receiptNo) return { label: `Paid ${ymdLabel(p.paidAt)}`, tone: "paid" as const };
  if (isOverdue(p, today)) {
    const n = daysBetween(p.dueDate, today);
    return { label: `Overdue ${n} day${n === 1 ? "" : "s"}`, tone: "overdue" as const };
  }
  if (p.dueDate) return { label: p.dueDate === today ? "Due today" : `Due ${ymdLabel(p.dueDate)}`, tone: "due" as const };
  return { label: "Upcoming", tone: "upcoming" as const };
}

function needsAction(r: AdminReservation, now: number, today: string) {
  if (r.status === "reserved" && r.holdUntil && Date.parse(r.holdUntil) - now < DAY) return true;
  return (r.status === "reserved" || r.status === "sold") && r.payments.some((p) => isOverdue(p, today));
}

interface Props {
  list: AdminReservation[];
  units: UnitOption[];
  leads: LeadOption[];
  customers: { id: number; name: string; mobile: string }[];
  agents: string[];
  initial: number | null;
  newFor: number | null;
  now: number;
}

export function SalesConsole({ list, units, leads, customers, agents, initial, newFor, now: serverNow }: Props) {
  const { toast, confirm } = useAdminUi();
  const [now, setNow] = useState(serverNow);
  const today = ymdOf(now);
  const first = list.find((r) => r.id === initial);
  const [tab, setTab] = useState<Tab>(first ? (first.status === "sold" ? "sale" : first.status === "reserved" ? "res" : "closed") : "res");
  const [cur, setCur] = useState<number | null>(first?.id ?? list.find((r) => r.status === "reserved")?.id ?? list[0]?.id ?? null);
  const [paying, setPaying] = useState<AdminPayment | null>(null);
  const [creating, setCreating] = useState(newFor != null);
  const [pending, start] = useTransition();

  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);

  const active = list.filter((r) => r.status === "reserved" || r.status === "sold");
  const overdue = useMemo(() => active.flatMap((r) => r.payments.filter((p) => isOverdue(p, today)).map((p) => ({ r, p }))), [active, today]);
  const items = list.filter((r) =>
    tab === "res" ? r.status === "reserved" : tab === "sale" ? r.status === "sold" : tab === "alert" ? needsAction(r, now, today) : r.status === "released" || r.status === "cancelled",
  );
  const c = list.find((r) => r.id === cur) ?? null;

  const alerts = [
    ...overdue.slice(0, 2).map(({ r, p }) => ({
      key: `p${p.id}`,
      tone: "danger" as const,
      text: `${r.customer.name} · ${r.unit.projectName} ${r.unit.code} · ${p.milestone} ${rsMn(p.amount)} is overdue by ${daysBetween(p.dueDate, today)} days.`,
      go: () => (setTab("sale"), setCur(r.id)),
    })),
    ...active
      .filter((r) => r.status === "reserved" && r.holdUntil && Date.parse(r.holdUntil) - now < DAY)
      .slice(0, 2)
      .map((r) => {
        const ms = Date.parse(r.holdUntil!) - now;
        const fee = r.payments[0];
        return {
          key: `h${r.id}`,
          tone: ms <= 0 ? ("danger" as const) : ("warn" as const),
          text: `${r.customer.name} · ${r.unit.projectName} ${r.unit.code} · ${ms <= 0 ? "hold has expired — extend it or release the unit" : `hold expires in ${left(ms).split(" ").slice(0, 2).join(" ")}`}.${fee && !fee.receiptNo ? " Booking fee not received." : ""}`,
          go: () => (setTab("res"), setCur(r.id)),
        };
      }),
  ];

  function exportCollections() {
    const rows: (string | number)[][] = [["Reference", "Status", "Customer", "Mobile", "Project", "Unit", "Milestone", "Amount (LKR)", "Due", "State", "Paid on", "Paid (LKR)", "Method", "Bank reference", "Receipt"]];
    for (const r of active)
      for (const p of r.payments) {
        const st = payStatus(p, today);
        rows.push([r.ref, STATUS_LABEL[r.status], r.customer.name, r.customer.mobile, r.unit.projectName, `${r.unit.tower}-${r.unit.code}`, p.milestone, p.amount, p.dueDate, st.label, p.paidAt, p.paidAmount || "", p.method, p.reference, p.receiptNo ?? ""]);
      }
    downloadCsv(`ovdc-collections-${today}.csv`, rows);
    toast(`Collections report exported · ${rows.length - 1} instalments`);
  }

  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) =>
    start(async () => {
      try {
        const r = await fn();
        toast(r.ok ? (r.message ?? "Saved") : (r.error ?? "Could not save"), r.ok ? "ok" : "err");
      } catch {
        toast("Could not save. Check your connection and try again.", "err");
      }
    });

  const overdueTotal = overdue.reduce((n, x) => n + x.p.amount, 0);
  const reservedN = list.filter((r) => r.status === "reserved").length;
  const soldN = list.filter((r) => r.status === "sold").length;

  return (
    <div className={s.page}>
      <div className="ad-page-head">
        <div>
          <h1>Reservations &amp; sales</h1>
          <div className="ad-sub">
            {reservedN} active reservation{reservedN === 1 ? "" : "s"} · {soldN} sale{soldN === 1 ? "" : "s"}
            {overdueTotal > 0 && <> · <span style={{ color: "var(--a-danger-text)", fontWeight: 600 }}>{rsMn(overdueTotal)} overdue</span></>}
          </div>
        </div>
        <button type="button" className="ad-btn ad-btn-secondary" onClick={exportCollections} disabled={!active.length}>
          <Download size={16} />
          Collections report
        </button>
        <button type="button" className="ad-btn ad-btn-primary" onClick={() => setCreating(true)}>
          <Plus size={16} />
          New reservation
        </button>
      </div>

      {alerts.length > 0 && (
        <div className={s.alerts}>
          {alerts.map((a) => (
            <div key={a.key} role="alert" className={s.alert} data-tone={a.tone}>
              {a.tone === "danger" ? <CircleAlert size={16} /> : <Timer size={16} />}
              <span style={{ flex: 1 }}>{a.text}</span>
              <button type="button" className="ad-btn ad-btn-secondary ad-btn-sm" onClick={a.go}>
                Open
              </button>
            </div>
          ))}
        </div>
      )}

      <div className={s.split}>
        <aside className={s.list} aria-label="Reservations and sales">
          <div className={s.listHead}>
            <div className="ad-seg" role="group" aria-label="Filter" style={{ width: "100%" }}>
              {TABS.map((t) => (
                <button key={t.k} type="button" aria-pressed={tab === t.k} onClick={() => setTab(t.k)} style={{ flex: 1 }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <ul>
            {items.map((r) => {
              const ms = r.holdUntil ? Date.parse(r.holdUntil) - now : 0;
              const od = r.payments.some((p) => isOverdue(p, today));
              const urgent = r.status === "reserved" && ms < DAY;
              const chip = r.status === "reserved" ? (urgent ? left(ms).split(" ").slice(0, 2).join(" ") : `${Math.ceil(ms / DAY)} days`) : r.status === "sold" ? (od ? "Overdue" : "On track") : STATUS_LABEL[r.status];
              return (
                <li key={r.id}>
                  <button type="button" className={s.item} aria-current={r.id === cur || undefined} onClick={() => setCur(r.id)}>
                    <span className={s.letter} data-s={r.status}>
                      {r.status === "sold" ? "S" : r.status === "reserved" ? "R" : "A"}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span className={s.itemTop}>
                        <strong>
                          {r.unit.projectName} · {r.unit.code}
                        </strong>
                        <span className={s.chip} data-urgent={urgent || od || undefined}>
                          {chip}
                        </span>
                      </span>
                      <span className={s.itemSub}>
                        {r.customer.name} · {r.ref}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
            {!items.length && (
              <li className="ad-muted" style={{ padding: 16, fontSize: 13 }}>
                {tab === "alert" ? "Nothing needs action. Holds and instalments are on track." : tab === "closed" ? "No released or cancelled reservations in the last 90 days." : list.length ? "None here." : "No reservations yet. Use “New reservation” to hold a unit for a customer."}
              </li>
            )}
          </ul>
        </aside>

        {c ? (
          <Detail key={c.id} c={c} now={now} today={today} pending={pending} run={run} confirm={confirm} onPay={setPaying} />
        ) : (
          <div className="ad-empty" style={{ flex: "1 1 600px" }}>
            <strong>No reservation selected</strong>
            <span className="ad-muted">Reserve a unit for a customer to start their payment schedule.</span>
          </div>
        )}
      </div>

      {paying && c && <PaymentDialog payment={paying} r={c} today={today} onClose={() => setPaying(null)} />}
      {creating && (
        <NewReservationDialog
          units={units}
          leads={leads}
          customers={customers}
          agents={agents}
          initialLead={newFor}
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false);
            setTab("res");
            setCur(id);
          }}
        />
      )}
    </div>
  );
}

type Run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) => void;

function Detail({ c, now, today, pending, run, confirm, onPay }: { c: AdminReservation; now: number; today: string; pending: boolean; run: Run; confirm: ReturnType<typeof useAdminUi>["confirm"]; onPay: (p: AdminPayment) => void }) {
  const open = c.status === "reserved" || c.status === "sold";
  const ms = c.holdUntil ? Date.parse(c.holdUntil) - now : 0;
  const fee = c.payments[0];
  const paid = paidTotal(c);
  const total = Math.round(c.priceMn * 1e6);
  const step = c.agreementStep;
  const canSell = c.status === "reserved" && step >= 4 && (!fee || !!fee.receiptNo);
  const unitName = `Unit ${c.unit.code}`;

  async function release() {
    const sold = c.status === "sold";
    const ok = await confirm({
      danger: true,
      title: sold ? `Cancel the sale of ${unitName}?` : `Release ${unitName}?`,
      body: `${sold ? "The sale is cancelled" : "The reservation is cancelled"} and the unit shows as Available on ovdc.lk immediately.${paid ? ` ${rs(paid)} has been received — refund it through Finance.` : ""}`,
      confirmLabel: sold ? "Cancel sale" : "Release unit",
    });
    if (ok) run(() => releaseReservation(c.id, ""));
  }

  return (
    <div className={s.detail}>
      <section className="ad-section">
        <div className={s.head}>
          <div style={{ flex: "1 1 260px" }}>
            <div className="ad-kicker">
              {STATUS_LABEL[c.status]} · {c.ref}
            </div>
            <div className={s.title}>
              {c.unit.projectName} · {unitName}
            </div>
            <div className="ad-muted" style={{ fontSize: 13 }}>
              Tower {c.unit.tower} · Level {c.unit.floor} · {c.unit.type} · {c.unit.label} · {c.unit.sqft.toLocaleString("en-GB")} sqft · {c.unit.view.toLowerCase()} view
            </div>
            <div style={{ fontSize: 13, marginTop: 6 }}>
              Customer{" "}
              <Link href={`/admin/customers?c=${c.customer.id}`}>
                <strong>{c.customer.name}</strong>
              </Link>
              {c.agent && <> · agent {c.agent}</>}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="ad-muted" style={{ fontSize: 12 }}>
              Agreed price
            </div>
            <div className={s.price}>{lkr(c.priceMn)}</div>
            <div className="ad-muted" style={{ fontSize: 12 }}>
              {PLAN_LABEL[c.plan]}
            </div>
          </div>
        </div>

        {c.status === "reserved" && (
          <div className={s.tiles}>
            <div className={s.tile}>
              <div className="ad-muted" style={{ fontSize: 12 }}>
                Reservation expires in
              </div>
              <div className={s.big} data-urgent={ms < DAY || undefined} aria-live="off" suppressHydrationWarning>
                {left(ms)}
              </div>
              <div className="ad-muted" style={{ fontSize: 12 }}>
                {c.holdUntil && new Date(c.holdUntil).toLocaleString("en-GB", { timeZone: "Asia/Colombo", weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })}
              </div>
              <div className={s.tileActions}>
                <button type="button" className="ad-btn ad-btn-secondary ad-btn-sm" disabled={pending} onClick={() => run(() => extendHold(c.id))}>
                  Extend {EXTEND_DAYS} days
                </button>
                <button type="button" className="ad-btn ad-btn-ghost ad-btn-sm" style={{ color: "var(--a-danger-text)" }} disabled={pending} onClick={release}>
                  Release unit
                </button>
              </div>
            </div>
            {fee && (
              <div className={s.tile}>
                <div className="ad-muted" style={{ fontSize: 12 }}>
                  Booking fee
                </div>
                <div className={s.big}>{rs(fee.amount)}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: fee.receiptNo ? "var(--a-ok-text)" : isOverdue(fee, today) ? "var(--a-danger-text)" : "var(--a-gold-text)" }}>{fee.receiptNo ? `Paid · receipt ${fee.receiptNo}` : payStatus(fee, today).label}</div>
                {!fee.receiptNo && (
                  <div className={s.tileActions}>
                    <button type="button" className="ad-btn ad-btn-primary ad-btn-sm" onClick={() => onPay(fee)}>
                      Record payment
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {c.status === "sold" && (
          <div className={s.tiles}>
            <div className={s.tile}>
              <div className="ad-muted" style={{ fontSize: 12 }}>
                Sold
              </div>
              <div className={s.big}>{c.soldAt ? dateShort(c.soldAt) : "—"}</div>
              <div className="ad-muted" style={{ fontSize: 12 }}>
                Shows as Sold on ovdc.lk
              </div>
            </div>
            <div className={s.tile}>
              <div className="ad-muted" style={{ fontSize: 12 }}>
                Collected
              </div>
              <div className={s.big}>{Math.round((paid / total) * 100)}%</div>
              <div className="ad-muted" style={{ fontSize: 12 }}>
                {rsMn(paid)} of {rsMn(total)}
              </div>
            </div>
          </div>
        )}
        {!open && (
          <div className={s.closed}>
            {STATUS_LABEL[c.status]} {c.closedAt && dateShort(c.closedAt)} · the unit went back on sale.{paid > 0 && ` ${rs(paid)} was received — check the refund with Finance.`}
          </div>
        )}

        <div className={s.agreement}>
          <div className="ad-kicker" style={{ marginBottom: 10 }}>
            Agreement
          </div>
          <ol className={s.steps}>
            {AGREEMENT.map((a, i) => {
              const st = i < step ? "done" : i === step ? "now" : "todo";
              return (
                <li key={a} data-st={st}>
                  <div className={s.stepBar} />
                  <span className={s.stepLabel}>
                    {st === "done" ? <CircleCheck size={14} /> : st === "now" ? <CircleDot size={14} /> : <Circle size={14} />}
                    {a}
                  </span>
                </li>
              );
            })}
          </ol>
          {open && (
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              {step < AGREEMENT.length && (
                <button type="button" className="ad-btn ad-btn-secondary" disabled={pending} onClick={() => run(() => setAgreementStep(c.id, step + 1))}>
                  Mark as {AGREEMENT[step].toLowerCase()}
                </button>
              )}
              {step > 1 && (
                <button type="button" className="ad-btn ad-btn-ghost" disabled={pending} onClick={() => run(() => setAgreementStep(c.id, step - 1))}>
                  <Undo2 size={15} />
                  Step back
                </button>
              )}
              <div style={{ flex: 1 }} />
              {c.status === "reserved" && (
                <button
                  type="button"
                  className="ad-btn ad-btn-primary"
                  disabled={pending || !canSell}
                  title={canSell ? undefined : step < 4 ? "The customer must sign the agreement first" : "Record the booking fee first"}
                  onClick={async () => {
                    if (await confirm({ title: `Mark ${unitName} as sold?`, body: `${c.customer.name} becomes the owner and the unit shows as Sold on ovdc.lk.`, confirmLabel: "Mark as sold" })) run(() => markSold(c.id));
                  }}
                >
                  Mark as sold
                </button>
              )}
              {c.status === "sold" && (
                <button type="button" className="ad-btn ad-btn-ghost" style={{ color: "var(--a-danger-text)" }} disabled={pending} onClick={release}>
                  Cancel sale
                </button>
              )}
            </div>
          )}
        </div>
        {c.note && <div className={s.note}>{c.note}</div>}
      </section>

      <section className="ad-section" aria-label="Payment schedule">
        <div className="ad-section-head">
          <h5>Payment schedule · {PLAN_LABEL[c.plan].toLowerCase()}</h5>
          <span style={{ fontSize: 13 }}>
            Paid <strong>{rsMn(paid)}</strong> of {rsMn(total)}
          </span>
        </div>
        <div style={{ padding: "10px 16px 0" }}>
          <div className="ad-bar">
            {c.payments.map((p) => (
              <span key={p.id} className={s.seg} data-tone={payStatus(p, today).tone} style={{ flex: Math.max(p.amount, 1) }} />
            ))}
          </div>
        </div>
        <div style={{ overflowX: "auto", padding: "0 8px 8px" }}>
          <table className="ad-table" style={{ minWidth: 760, fontSize: 13 }}>
            <thead>
              <tr>
                <th>Milestone</th>
                <th className="r">Amount</th>
                <th>Due</th>
                <th>Status</th>
                <th>Receipt</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {c.payments.map((p) => {
                const st = payStatus(p, today);
                return (
                  <tr key={p.id} data-tone={st.tone} className={s.payRow}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.milestone}</div>
                      <div className="ad-muted" style={{ fontSize: 11.5 }}>
                        {p.condition}
                      </div>
                    </td>
                    <td className="r" style={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                      {rs(p.amount)}
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {p.receiptNo || !open ? (
                        p.dueDate ? ymdLabel(p.dueDate) : "—"
                      ) : (
                        <input
                          type="date"
                          className="ad-input"
                          aria-label={`Due date for ${p.milestone}`}
                          style={{ width: 150, minHeight: 32 }}
                          defaultValue={p.dueDate}
                          onBlur={(e) => e.target.value !== p.dueDate && run(() => setDueDate(p.id, e.target.value))}
                        />
                      )}
                    </td>
                    <td>
                      <span className={s.tag} data-tone={st.tone}>
                        {st.label}
                      </span>
                      {p.receiptNo && p.paidAmount !== p.amount && (
                        <div className="ad-muted" style={{ fontSize: 11.5 }}>
                          Received {rs(p.paidAmount)}
                        </div>
                      )}
                    </td>
                    <td>
                      {p.receiptNo && (
                        <a className="ad-btn ad-btn-ghost ad-btn-sm" style={{ paddingLeft: 0 }} href={`/admin/receipt/${p.id}`} target="_blank" rel="noreferrer">
                          <FileDown size={14} />
                          {p.receiptNo}
                        </a>
                      )}
                    </td>
                    <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                      {open && !p.receiptNo && (
                        <button type="button" className="ad-btn ad-btn-secondary ad-btn-sm" onClick={() => onPay(p)}>
                          Record payment
                        </button>
                      )}
                      {open && p.receiptNo && (
                        <button
                          type="button"
                          className="ad-btn ad-btn-ghost ad-btn-sm"
                          disabled={pending}
                          onClick={async () => {
                            if (await confirm({ danger: true, title: `Void receipt ${p.receiptNo}?`, body: "Use this only for a payment entered by mistake. The instalment shows as unpaid again.", confirmLabel: "Void receipt" })) run(() => voidPayment(p.id));
                          }}
                        >
                          Void
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
