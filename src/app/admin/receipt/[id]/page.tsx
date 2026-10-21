import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/admin/auth";
import { loadSiteSettings } from "@/lib/api";
import { PLAN_LABEL, rs } from "@/lib/admin/sales";
import { DbMissing, PageSkeleton } from "@/components/admin/States";
import { PrintButton } from "./PrintButton";
import s from "./receipt.module.css";

export const metadata: Metadata = { title: "Receipt" };

export default function ReceiptPage(props: PageProps<"/admin/receipt/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton rows={6} />}>
      <Receipt {...props} />
    </Suspense>
  );
}

const ymdLabel = (ymd: string) => new Date(`${ymd}T00:00:00Z`).toLocaleDateString("en-GB", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" });

/** Rupees in words, as on a printed receipt ("Eight million one hundred and forty thousand"). */
function words(n: number): string {
  const ones = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
  const tens = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
  const under1000 = (x: number) => {
    const h = Math.floor(x / 100);
    const r = x % 100;
    const t = r < 20 ? ones[r] : `${tens[Math.floor(r / 10)]}${r % 10 ? `-${ones[r % 10]}` : ""}`;
    return [h ? `${ones[h]} hundred` : "", t].filter(Boolean).join(" and ");
  };
  if (n === 0) return "Zero";
  const parts: string[] = [];
  for (const [v, name] of [
    [1e9, "billion"],
    [1e6, "million"],
    [1e3, "thousand"],
    [1, ""],
  ] as const) {
    const q = Math.floor(n / v) % 1000;
    if (q) parts.push(`${under1000(q)}${name ? ` ${name}` : ""}`);
  }
  const out = parts.join(" ");
  return out[0].toUpperCase() + out.slice(1);
}

async function Receipt({ params }: PageProps<"/admin/receipt/[id]">) {
  await requireAdmin();
  if (!db) return <DbMissing />;
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const [row] = await db
    .select({ p: schema.payments, r: schema.reservations, u: schema.units, project: schema.projects.name, c: schema.customers })
    .from(schema.payments)
    .innerJoin(schema.reservations, eq(schema.reservations.id, schema.payments.reservationId))
    .innerJoin(schema.units, eq(schema.units.id, schema.reservations.unitId))
    .innerJoin(schema.projects, eq(schema.projects.slug, schema.units.projectSlug))
    .innerJoin(schema.customers, eq(schema.customers.id, schema.reservations.customerId))
    .where(eq(schema.payments.id, id))
    .limit(1);
  if (!row || !row.p.receiptNo) notFound();
  const { company } = await loadSiteSettings();
  const { p, r, u, c, project } = row;

  return (
    <main className={s.wrap}>
      <div className={s.tools}>
        <PrintButton />
      </div>
      <article className={s.sheet} aria-label={`Receipt ${p.receiptNo}`}>
        <header className={s.top}>
          <div>
            <div className={s.brand}>{company.short}</div>
            <div className={s.small}>{company.name}</div>
            <div className={s.small}>{company.address.join(", ")}</div>
            <div className={s.small}>
              {company.hotline} · {company.email} · {company.web}
            </div>
            <div className={s.small}>
              Company reg. {company.reg}
              {company.vat && ` · VAT ${company.vat}`}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className={s.kicker}>Official receipt</div>
            <div className={s.no}>{p.receiptNo}</div>
            <div className={s.small}>Date {ymdLabel(p.paidAt)}</div>
          </div>
        </header>

        <section className={s.grid}>
          <div>
            <div className={s.kicker}>Received from</div>
            <strong>{c.name}</strong>
            {c.nic && <div className={s.small}>NIC {c.nic}</div>}
            {c.address && <div className={s.small}>{c.address}</div>}
            <div className={s.small}>{[c.mobile, c.email].filter(Boolean).join(" · ")}</div>
          </div>
          <div>
            <div className={s.kicker}>For</div>
            <strong>
              {project} · Unit {u.code}
            </strong>
            <div className={s.small}>
              Tower {u.tower} · Level {u.floor} · {u.type} · {u.label} · {u.sqft.toLocaleString("en-GB")} sqft
            </div>
            <div className={s.small}>
              Reservation {r.ref} · {PLAN_LABEL[r.plan]}
            </div>
          </div>
        </section>

        <table className={s.table}>
          <thead>
            <tr>
              <th>Description</th>
              <th>Method</th>
              <th>Reference</th>
              <th style={{ textAlign: "right" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                {p.milestone}
                <div className={s.small}>{p.condition}</div>
              </td>
              <td>{p.method}</td>
              <td>{p.reference}</td>
              <td style={{ textAlign: "right", fontWeight: 700, whiteSpace: "nowrap" }}>{rs(p.paidAmount)}</td>
            </tr>
          </tbody>
        </table>
        <p className={s.words}>{words(p.paidAmount)} rupees only.</p>

        <footer className={s.foot}>
          <div className={s.small}>
            Recorded by {p.recordedBy}. Valid subject to the payment being realised. Agreed price of the unit {rs(Math.round(r.priceMn * 1e6))}.
          </div>
          <div className={s.sign}>Authorised signature</div>
        </footer>
      </article>
    </main>
  );
}
