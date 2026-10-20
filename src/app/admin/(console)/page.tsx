import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, Building2, CircleDollarSign, Gauge, LayoutGrid, Ruler } from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { getDashboard, hasDb } from "@/lib/admin/queries";
import { STAGE_LABEL, TZ, lkr } from "@/lib/admin/format";
import { ActivityFeed } from "@/components/admin/ActivityFeed";
import { DbMissing, PageSkeleton } from "@/components/admin/States";
import type { UnitStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <Suspense fallback={<PageSkeleton kpis />}>
      <Dashboard />
    </Suspense>
  );
}

const SPLIT: { k: UnitStatus; label: string }[] = [
  { k: "A", label: "Available" },
  { k: "R", label: "Reserved" },
  { k: "S", label: "Sold" },
  { k: "B", label: "Not released" },
];

function greeting(now: Date) {
  const h = Number(now.toLocaleString("en-GB", { timeZone: TZ, hour: "2-digit", hour12: false }));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

async function Dashboard() {
  const admin = await requireAdmin();
  if (!hasDb()) return <DbMissing />;
  const { projects, units, activity } = await getDashboard();
  const now = new Date();

  const count = { A: 0, R: 0, S: 0, B: 0 } as Record<UnitStatus, number>;
  const value = { A: 0, R: 0, S: 0, B: 0 } as Record<UnitStatus, number>;
  let availSqft = 0;
  for (const u of units) {
    count[u.status]++;
    value[u.status] += u.priceMn;
    if (u.status === "A") availSqft += u.sqft;
  }
  const total = units.length;
  const released = total - count.B;
  const live = projects.filter((p) => p.published).length;
  const fromAvail = units.filter((u) => u.status === "A").reduce((m, u) => Math.min(m, u.priceMn), Infinity);

  // Availability per project tower
  const names = new Map(projects.map((p) => [p.slug, p.name]));
  const towers = new Map<string, { label: string; slug: string; tower: string; c: Record<UnitStatus, number>; n: number }>();
  for (const u of units) {
    const key = `${u.slug}|${u.tower}`;
    const t = towers.get(key) ?? { label: `${names.get(u.slug) ?? u.slug} · Tower ${u.tower}`, slug: u.slug, tower: u.tower, c: { A: 0, R: 0, S: 0, B: 0 }, n: 0 };
    t.c[u.status]++;
    t.n++;
    towers.set(key, t);
  }

  // Layout mix
  const types = new Map<string, { type: string; label: string; c: Record<UnitStatus, number>; from: number; sqft: number; n: number }>();
  for (const u of units) {
    const t = types.get(u.type) ?? { type: u.type, label: u.label, c: { A: 0, R: 0, S: 0, B: 0 }, from: Infinity, sqft: 0, n: 0 };
    t.c[u.status]++;
    t.n++;
    t.sqft += u.sqft;
    if (u.status === "A") t.from = Math.min(t.from, u.priceMn);
    types.set(u.type, t);
  }
  const typeRows = [...types.values()].sort((a, b) => a.type.localeCompare(b.type));

  return (
    <div className="ad-page">
      <div className="ad-page-head">
        <div>
          <h1>
            {greeting(now)}, {admin.name.split(" ")[0]}
          </h1>
          <div className="ad-sub">
            {now.toLocaleDateString("en-GB", { timeZone: TZ, weekday: "long", day: "numeric", month: "long", year: "numeric" })} · All projects · Live
            inventory
          </div>
        </div>
        <Link href="/admin/units" className="ad-btn ad-btn-primary">
          <LayoutGrid size={16} />
          Manage units
        </Link>
      </div>

      <div className="ad-kpis ad-kpis-dash">
        <Link href="/admin/projects" className="ad-kpi">
          <div className="ad-kpi-label">
            <Building2 size={14} />
            Projects
          </div>
          <div className="ad-kpi-value">{projects.length}</div>
          <div className="ad-kpi-sub">
            {live} live · {projects.length - live} draft{projects.length - live === 1 ? "" : "s"}
          </div>
        </Link>
        <Link href="/admin/units" className="ad-kpi wide">
          <div className="ad-kpi-label">
            <LayoutGrid size={14} />
            Units · {total}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {SPLIT.map((x) => (
              <div key={x.k}>
                <div className="ad-num" style={{ fontSize: 26 }}>
                  {count[x.k]}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, marginTop: 5 }} className="ad-muted">
                  <span className={`ad-st ad-st-${x.k}`} style={{ width: 9, height: 9 }} />
                  {x.label}
                </div>
              </div>
            ))}
          </div>
          <div className="ad-bar" aria-hidden="true">
            {SPLIT.map((x) => (
              <span key={x.k} className={`ad-st-${x.k}`} style={{ flex: count[x.k] }} />
            ))}
          </div>
        </Link>
        <div className="ad-kpi">
          <div className="ad-kpi-label">
            <CircleDollarSign size={14} />
            Available stock
          </div>
          <div className="ad-kpi-value" style={{ fontSize: 26 }}>
            {lkr(Math.round(value.A))}
          </div>
          <div className="ad-kpi-sub">{count.A ? `${count.A} homes from ${lkr(fromAvail)}` : "Nothing available"}</div>
        </div>
        <div className="ad-kpi">
          <div className="ad-kpi-label">
            <Gauge size={14} />
            Sold & reserved
          </div>
          <div className="ad-kpi-value" style={{ fontSize: 26 }}>
            {lkr(Math.round(value.S + value.R))}
          </div>
          <div className="ad-kpi-sub">{released ? `${Math.round(((count.S + count.R) / released) * 100)}% of released stock` : "—"}</div>
        </div>
        <div className="ad-kpi">
          <div className="ad-kpi-label">
            <Ruler size={14} />
            Avg. price / sqft
          </div>
          <div className="ad-kpi-value" style={{ fontSize: 26 }}>
            {availSqft ? `${Math.round((value.A * 1e6) / availSqft).toLocaleString("en-US")}` : "—"}
          </div>
          <div className="ad-kpi-sub">LKR · available homes</div>
        </div>
      </div>

      <div className="ad-cols">
        <div className="main ad-stack">
          <section className="ad-section">
            <div className="ad-section-head">
              <h5>Availability by tower</h5>
              <span className="ad-muted" style={{ fontSize: 12 }}>
                Shown live on the website explorer
              </span>
            </div>
            <div className="ad-section-body" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {[...towers.values()].map((t) => {
                const rel = t.n - t.c.B;
                return (
                  <div key={t.label}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
                      <Link href={`/admin/units?project=${t.slug}&tower=${t.tower}`} style={{ fontWeight: 700, color: "var(--a-text)", textDecoration: "none" }}>
                        {t.label}
                      </Link>
                      <span className="ad-muted" style={{ fontSize: 12.5 }}>
                        {t.n} units · {rel} released · {rel ? Math.round(((t.c.S + t.c.R) / rel) * 100) : 0}% taken
                      </span>
                    </div>
                    <div style={{ display: "flex", height: 26, gap: 2 }}>
                      {SPLIT.map((x) =>
                        t.c[x.k] ? (
                          <span
                            key={x.k}
                            className={`ad-st-${x.k}`}
                            title={`${x.label}: ${t.c[x.k]}`}
                            style={{ flex: t.c[x.k], display: "flex", alignItems: "center", padding: "0 8px", fontSize: 12, fontWeight: 800, minWidth: 26, overflow: "hidden" }}
                          >
                            {t.c[x.k]}
                          </span>
                        ) : null,
                      )}
                    </div>
                  </div>
                );
              })}
              {!towers.size && <p className="ad-muted">No unit inventory yet.</p>}
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12 }} className="ad-muted">
                {SPLIT.map((x) => (
                  <span key={x.k} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span className={`ad-st ad-st-${x.k}`} style={{ width: 10, height: 10 }} />
                    {x.label}
                  </span>
                ))}
              </div>
            </div>
          </section>
          <section className="ad-section">
            <div className="ad-section-head">
              <h5>Homes by layout</h5>
              <span className="ad-muted" style={{ fontSize: 12 }}>
                All towers
              </span>
            </div>
            <div style={{ overflowX: "auto", padding: "4px 8px 8px" }}>
              <table className="ad-table" style={{ minWidth: 560 }}>
                <thead>
                  <tr>
                    <th>Layout</th>
                    <th className="r">Available</th>
                    <th className="r">Reserved</th>
                    <th className="r">Sold</th>
                    <th className="r">Avg. sqft</th>
                    <th className="r">From</th>
                  </tr>
                </thead>
                <tbody>
                  {typeRows.map((t) => (
                    <tr key={t.type}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{t.type}</div>
                        <div className="ad-muted" style={{ fontSize: 12 }}>
                          {t.label}
                        </div>
                      </td>
                      <td className="r" style={{ fontWeight: 700 }}>
                        {t.c.A}
                      </td>
                      <td className="r">{t.c.R}</td>
                      <td className="r">{t.c.S}</td>
                      <td className="r">{Math.round(t.sqft / t.n).toLocaleString("en-US")}</td>
                      <td className="r" style={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                        {Number.isFinite(t.from) ? lkr(t.from) : "Sold out"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
        <div className="side ad-stack">
          <section className="ad-section">
            <div className="ad-section-head">
              <h5>Projects</h5>
              <Link href="/admin/projects" className="ad-btn ad-btn-ghost ad-btn-sm">
                All projects
                <ArrowRight size={14} />
              </Link>
            </div>
            {projects.map((p) => (
              <Link key={p.slug} href={`/admin/projects/${p.slug}`} className="ad-row" style={{ color: "var(--a-text)", textDecoration: "none", display: "grid", gridTemplateColumns: "1fr auto", gap: "6px 10px" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                  <div className="ad-muted" style={{ fontSize: 11.5 }}>
                    {p.loc} · {STAGE_LABEL[p.status]}
                  </div>
                </div>
                <span className={`ad-tag ${p.published ? "ad-tag-ok" : "ad-tag-neutral"}`} style={{ alignSelf: "start" }}>
                  {p.published ? "Live" : "Draft"}
                </span>
                <div className="ad-meter" style={{ gridColumn: "1 / -1" }} title={`Construction ${p.progress}%`}>
                  <span style={{ width: `${p.progress}%` }} />
                </div>
              </Link>
            ))}
          </section>
          <section className="ad-section">
            <div className="ad-section-head">
              <h5>Recent changes</h5>
              <Link href="/admin/activity" className="ad-btn ad-btn-ghost ad-btn-sm">
                Activity log
                <ArrowRight size={14} />
              </Link>
            </div>
            <ActivityFeed items={activity} compact />
          </section>
        </div>
      </div>
    </div>
  );
}
