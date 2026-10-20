import type { Metadata } from "next";
import Link from "next/link";
import { photos } from "@/lib/data/media";
import { routes } from "@/lib/routes";
import { PageHero } from "@/components/ui/PageHero";
import { ImageSlot } from "@/components/ui/ImageSlot";
import c from "@/components/content/content.module.css";

export const metadata: Metadata = {
  title: "Buyer’s guide · buying an apartment in Sri Lanka",
  description: "The six steps from choosing a home to receiving your deed, the documents you need and the costs to plan for.",
};

const STEPS = [
  ["Choose your home", "Compare projects, walk the 360° tours and visit the show apartment. Use the building explorer to see what is available on each floor."],
  ["Reserve", "Pay the LKR 500,000 reservation fee to hold the unit for 14 days while you and your lawyer review the sale agreement."],
  ["Sign the sale agreement", "Pay 20% on signing. The agreement fixes the price, the specification, the payment schedule and the handover date."],
  ["Pay as we build", "Instalments fall due as the architect certifies each construction stage. A housing loan, if you use one, is released the same way."],
  ["Handover", "Walk the finished home with us, record any snags and receive your keys. Defects are put right within the defects-liability period."],
  ["Receive your deed", "Once the condominium plan is registered with the Condominium Management Authority, individual deeds are executed, typically within six months."],
];

const DOCS = [
  ["National identity card or passport", "For every buyer named on the agreement"],
  ["Proof of address", "Recent utility bill or bank statement"],
  ["Tax identification number (TIN)", "If you have one in Sri Lanka"],
  ["Loan offer letter", "If you are using a housing loan"],
  ["Power of attorney", "If someone will sign on your behalf"],
  ["IIA bank details", "If you are paying in foreign currency"],
];

const COSTS = [
  ["Reservation fee", "LKR 500,000, adjusted against your booking payment"],
  ["Stamp duty on the deed", "A percentage of the purchase price — your lawyer confirms the current rate"],
  ["Legal and notary fees", "For the sale agreement and the deed"],
  ["Sinking-fund contribution", "One-off, at handover, for long-term building repairs"],
  ["Management fee", "Monthly, set by the management corporation (estimated LKR 45 per sqft)"],
];

export default function BuyersGuidePage() {
  return (
    <>
      <PageHero
        crumb="Buyer’s guide"
        kicker="Buying in Sri Lanka"
        title="From first visit to your deed"
        lead="Six steps, the documents you’ll need, and the costs to plan for. Every purchase is different, so always take independent legal advice."
        photo={photos.keys}
      />

      <section className={c.section}>
        <div className={c.headText}>
          <span className="kicker">The process</span>
          <h2 className="h-section">Six steps to your keys</h2>
        </div>
        <ol className={c.steps}>
          {STEPS.map(([t, b]) => (
            <li key={t}>
              <h3>{t}</h3>
              <p>{b}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className={`${c.section} ${c.surface}`}>
        <div className={c.split}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <span className="kicker" style={{ color: "var(--color-kicker-sand)" }}>
              Checklist
            </span>
            <h2 className="h-section">Documents you’ll need</h2>
            <ul className={c.list}>
              {DOCS.map(([t, b]) => (
                <li key={t}>
                  <strong style={{ fontWeight: 600 }}>{t}</strong>
                  <span className="muted" style={{ textAlign: "right" }}>
                    {b}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <span className="kicker" style={{ color: "var(--color-kicker-sand)" }}>
              Budget
            </span>
            <h2 className="h-section">Costs beyond the price</h2>
            <ul className={c.list}>
              {COSTS.map(([t, b]) => (
                <li key={t} style={{ flexDirection: "column", gap: 4 }}>
                  <strong style={{ fontWeight: 600 }}>{t}</strong>
                  <span className="muted" style={{ fontSize: 14 }}>
                    {b}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className={c.section}>
        <div className={c.split} style={{ alignItems: "center" }}>
          <div className="zoom" style={{ position: "relative", aspectRatio: "16/10" }}>
            <ImageSlot photo={photos.plans} sizes="(max-width: 760px) 100vw, 50vw" />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <span className="kicker">Tools</span>
            <h2 className="h-section">Run the numbers</h2>
            <p className="lead">See every instalment for the unit you like, and estimate a housing-loan payment in LKR.</p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link className="btn btn-primary" href={routes.calculators}>
                Open the calculators<span aria-hidden>→</span>
              </Link>
              <Link className="btn btn-secondary" href={routes.overseas}>
                Buying from abroad
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
