import type { Metadata } from "next";
import { photos } from "@/lib/data/media";
import { company } from "@/lib/data/content";
import { PageHero } from "@/components/ui/PageHero";
import { SimpleLeadForm } from "@/components/content/SimpleLeadForm";
import c from "@/components/content/content.module.css";

export const metadata: Metadata = {
  title: "Homeowner portal",
  description: "Your unit, payment schedule, receipts, documents and construction updates in one place.",
};

const FEATURES = [
  ["Payment schedule", "Every instalment with its status — paid, due or overdue — and the stage certificate behind it."],
  ["Receipts & statements", "Download receipts and a statement of account at any time."],
  ["Construction updates", "Monthly photos and progress for your tower, as soon as they are published."],
  ["Documents", "Your sale agreement, specification, floor plan and handover pack."],
  ["Support", "Raise a question or a snag and follow it to resolution."],
];

export default function PortalPage() {
  return (
    <>
      <PageHero
        crumb="Homeowner portal"
        kicker="For OVDC buyers"
        title="Your home, in one place"
        lead="The homeowner portal opens with OVDC’s new sales and CRM system. Until then, request access below and your relationship manager will send your statement and documents directly."
        photo={photos.keys}
      />
      <section className={c.section}>
        <div className={c.split}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <span className="kicker">What’s inside</span>
            <h2 className="h-section">Everything after you sign</h2>
            <ul className={c.list}>
              {FEATURES.map(([t, b]) => (
                <li key={t} style={{ flexDirection: "column", gap: 4 }}>
                  <strong style={{ fontWeight: 600 }}>{t}</strong>
                  <span className="muted" style={{ fontSize: 14 }}>
                    {b}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: "clamp(24px, 3vw, 36px)", background: "var(--color-surface)" }}>
            <span className="kicker" style={{ color: "var(--color-kicker-sand)" }}>
              Request access
            </span>
            <h2 className="h-sub">Get your login when the portal opens</h2>
            <SimpleLeadForm
              kind="portal-access"
              submitLabel="Request access"
              doneTitle="Request received"
              doneBody="Your relationship manager will confirm your details and send your current statement within one working day."
              fields={[
                { name: "name", label: "Full name (as on the agreement)", required: true, full: true },
                { name: "unit", label: "Unit number", required: true, placeholder: "e.g. A-14B" },
                { name: "mobile", label: "Mobile", type: "tel", required: true },
                { name: "email", label: "Email", type: "email", required: true, full: true },
              ]}
            />
            <p className="subtle" style={{ fontSize: 12 }}>
              Urgent? Call homeowner care on {company.hotline}.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
