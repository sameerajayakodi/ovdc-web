import type { Metadata } from "next";
import { getSiteSettings } from "@/lib/api";
import Link from "next/link";
import { photos } from "@/lib/data/media";
import { routes } from "@/lib/routes";
import { PageHero } from "@/components/ui/PageHero";
import { ImageSlot } from "@/components/ui/ImageSlot";
import c from "@/components/content/content.module.css";

export const metadata: Metadata = {
  title: "Overseas buyers · buy a home in Sri Lanka from abroad",
  description: "Choose by 360° tour and live video, pay in foreign currency through an IIA and sign through a power of attorney. Advisors in your time zone.",
};

const STEPS = [
  ["Explore remotely", "Walk the show apartment in 360°, pick a floor in the building explorer and book a live video tour at a time that suits you."],
  ["Reserve online", "We send the reservation form and sale agreement by email. Pay the reservation fee by international transfer."],
  ["Sign from abroad", "Sign at a Sri Lankan embassy or high commission, or appoint a trusted person in Sri Lanka through a power of attorney."],
  ["Pay in your currency", "Open an Inward Investment Account (IIA) at a licensed commercial bank and pay instalments from it. Keep the encashment certificates."],
  ["Follow every month", "Monthly photo updates and stage certificates arrive by email, so you always know where your money has gone."],
  ["Handover by proxy", "Your representative can inspect and accept the home for you; we share a video snag walk-through either way."],
];

const ZONES = [
  ["Australia", "Melbourne / Sydney", "Calls 9.00 am – 1.00 pm AEST"],
  ["Gulf", "Dubai / Doha / Riyadh", "Calls 8.00 am – 8.00 pm GST"],
  ["United Kingdom & Europe", "London", "Calls 7.00 am – 3.00 pm GMT"],
  ["North America", "Toronto / New York", "Calls by appointment, evenings"],
];

export default async function OverseasPage() {
  const { company } = await getSiteSettings();
  return (
    <>
      <PageHero
        crumb="Overseas buyers"
        kicker="For Sri Lankans abroad and international buyers"
        title={
          <>
            Buy your home <em>without the flight.</em>
          </>
        }
        lead="Around a third of OVDC buyers live outside Sri Lanka. Choose with 360° tours and live video, pay in foreign currency, and sign without travelling."
        photo={photos.oceanSunset}
      >
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link className="btn btn-primary btn-lg" href={routes.bookVisit() + "?visit=video"}>
            Book a video tour<span aria-hidden>→</span>
          </Link>
          <Link className="btn btn-secondary on-dark btn-lg" href={routes.tours}>
            360° tours
          </Link>
        </div>
      </PageHero>

      <section className={c.section}>
        <div className={c.headText}>
          <span className="kicker">How it works</span>
          <h2 className="h-section">Six steps from anywhere</h2>
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

      <section className={`${c.section} ${c.navyBand}`}>
        <div className={c.split}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <span className="kicker">Good to know</span>
            <h2 className="h-section">Foreign currency, ownership and tax</h2>
            <div className={c.prose} style={{ color: "var(--color-on-navy-muted)" }}>
              <p>
                <strong style={{ color: "var(--color-on-navy)" }}>Paying in foreign currency.</strong> Payments are made through an Inward Investment
                Account (IIA). Keeping the bank’s encashment certificates allows you to repatriate sale proceeds later.
              </p>
              <p>
                <strong style={{ color: "var(--color-on-navy)" }}>Foreign nationals.</strong> Foreign nationals can generally buy condominium apartments,
                subject to Sri Lankan law, including conditions on the floor of the unit. Your lawyer will confirm what applies to the home you choose.
              </p>
              <p>
                <strong style={{ color: "var(--color-on-navy)" }}>Indicative prices.</strong> Prices shown in USD, AUD or AED are converted at indicative
                rates; sale agreements are always in LKR.
              </p>
              <p style={{ fontSize: 13 }}>This page is general information, not legal or tax advice.</p>
            </div>
          </div>
          <div className="zoom" style={{ position: "relative", aspectRatio: "4/3" }}>
            <ImageSlot photo={photos.livingSea} tone="dark" sizes="(max-width: 760px) 100vw, 50vw" />
          </div>
        </div>
      </section>

      <section className={c.section}>
        <div className={c.headText}>
          <span className="kicker">Advisors in your time zone</span>
          <h2 className="h-section">We call when it suits you</h2>
        </div>
        <ul className={c.list}>
          {ZONES.map(([r, cities, hours]) => (
            <li key={r}>
              <span>
                <strong style={{ fontWeight: 600 }}>{r}</strong> <span className="muted">· {cities}</span>
              </span>
              <span className="muted">{hours}</span>
            </li>
          ))}
        </ul>
        <p className="muted" style={{ fontSize: 14 }}>
          WhatsApp <a href={company.whatsappHref}>{company.whatsapp}</a> or email <a href="mailto:global@ovdc.lk">global@ovdc.lk</a> and an advisor will reply in your
          working hours.
        </p>
      </section>
    </>
  );
}
