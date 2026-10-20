import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { paymentPlan } from "@/lib/data/content";
import { routes } from "@/lib/routes";
import { PageHero } from "@/components/ui/PageHero";
import { Calculators } from "@/components/content/Calculators";
import c from "@/components/content/content.module.css";

export const metadata: Metadata = {
  title: "Payment plan & housing loan calculator",
  description: "See what you pay at each construction stage and estimate your monthly housing-loan instalment in LKR.",
};

export default function CalculatorsPage() {
  return (
    <>
      <PageHero crumb="Calculators" title="Plan your purchase" lead="Work out the payments due at each construction stage, and estimate a housing-loan instalment. Prices are in LKR millions." />
      <Suspense fallback={<div className="wrap skeleton" style={{ height: 600, marginTop: 40 }} />}>
        <Calculators stages={paymentPlan} />
      </Suspense>
      <section className={c.cta}>
        <h2 style={{ fontSize: "clamp(32px, 3.6vw, 48px)", lineHeight: 1 }}>Talk the numbers through with an advisor</h2>
        <div className={c.ctaActions}>
          <Link className="btn btn-primary btn-lg" href={routes.bookVisit()}>
            Book a visit<span aria-hidden>→</span>
          </Link>
          <Link className="btn btn-secondary on-dark btn-lg" href={routes.buyersGuide}>
            Buyer’s guide
          </Link>
        </div>
      </section>
    </>
  );
}
