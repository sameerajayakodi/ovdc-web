import type { Metadata } from "next";
import Link from "next/link";
import { getFaqGroups } from "@/lib/api";
import { routes } from "@/lib/routes";
import { PageHero } from "@/components/ui/PageHero";
import { FaqSearch } from "@/components/content/FaqSearch";
import c from "@/components/content/content.module.css";

export const metadata: Metadata = {
  title: "Frequently asked questions",
  description: "Reservations, payment plans, housing loans, buying from abroad, construction and handover — answered.",
};

export default async function FaqPage() {
  const faqGroups = await getFaqGroups();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqGroups.flatMap((g) => g.items.map((i) => ({ "@type": "Question", name: i.q, acceptedAnswer: { "@type": "Answer", text: i.a } }))),
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <PageHero crumb="FAQ" title="Questions buyers ask" lead="If your question isn’t here, call or WhatsApp us — an advisor will answer the same day." />
      <section className={c.section}>
        <FaqSearch groups={faqGroups} />
      </section>
      <section className={c.cta}>
        <h2 style={{ fontSize: "clamp(32px, 3.6vw, 48px)", lineHeight: 1 }}>Still have a question?</h2>
        <div className={c.ctaActions}>
          <Link className="btn btn-primary btn-lg" href={routes.contact}>
            Contact us<span aria-hidden>→</span>
          </Link>
          <Link className="btn btn-secondary on-dark btn-lg" href={routes.buyersGuide}>
            Read the buyer’s guide
          </Link>
        </div>
      </section>
    </>
  );
}
