import type { Metadata } from "next";
import { awards, certifications } from "@/lib/data/editorial";
import { PageHero } from "@/components/ui/PageHero";
import c from "@/components/content/content.module.css";

export const metadata: Metadata = {
  title: "Awards & certifications",
  description: "Approvals, registrations and industry recognition for OVDC developments.",
};

export default function AwardsPage() {
  return (
    <>
      <PageHero crumb="Awards" title="Awards & certifications" lead="The approvals every project carries, and the recognition our teams have earned." />
      <section className={c.section}>
        <div className={c.headText}>
          <span className="kicker">Approvals & registrations</span>
          <h2 className="h-section">Built on the record</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(260px, 100%), 1fr))", borderTop: "2px solid var(--color-rule-strong)" }}>
          {certifications.map((x) => (
            <div key={x.mark} style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "24px 20px 24px 0", borderBottom: "1px solid var(--color-divider)" }}>
              <span style={{ display: "grid", placeItems: "center", minWidth: 56, height: 56, padding: "0 8px", flex: "none", border: "1px solid var(--color-gold)", font: "600 13px var(--font-label)", color: "var(--color-kicker)" }}>
                {x.mark}
              </span>
              <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 15, fontWeight: 600 }}>{x.title}</span>
                <span className="muted" style={{ fontSize: 13, lineHeight: 1.45 }}>
                  {x.body}
                </span>
              </span>
            </div>
          ))}
        </div>
      </section>
      <section className={`${c.section} ${c.navyBand}`}>
        <div className={c.headText}>
          <span className="kicker">Industry recognition</span>
          <h2 className="h-section">Awards</h2>
        </div>
        <ol className={c.list} style={{ borderTopColor: "var(--color-rule-dark-strong)" }}>
          {awards.map((a, i) => (
            <li key={i} style={{ borderBottomColor: "var(--color-rule-dark)", alignItems: "baseline" }}>
              <span style={{ display: "flex", gap: 24, alignItems: "baseline" }}>
                <span className="nums" style={{ fontFamily: "var(--font-heading)", fontSize: 32, color: "var(--color-gold)" }}>
                  {a.year}
                </span>
                <span style={{ fontSize: 17 }}>{a.title}</span>
              </span>
              <span style={{ color: "var(--color-on-navy-muted)" }}>{a.by}</span>
            </li>
          ))}
        </ol>
        <p style={{ fontSize: 13, color: "var(--color-on-navy-muted)" }}>Award details are being confirmed and will be published with certificates.</p>
      </section>
    </>
  );
}
