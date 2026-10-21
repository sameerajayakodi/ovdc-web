import type { Metadata } from "next";
import Link from "next/link";
import { getProjects, getSiteSettings } from "@/lib/api";
import { routes } from "@/lib/routes";
import { PageHero } from "@/components/ui/PageHero";
import { ContactForm } from "@/components/content/ContactForm";
import { OfficesMap } from "@/components/content/OfficesMap";
import { IconPhone, IconWhatsApp } from "@/components/ui/Icons";
import c from "@/components/content/content.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const { company } = await getSiteSettings();
  return {
    title: "Contact OVDC",
    description: `Call ${company.hotline}, WhatsApp ${company.whatsapp} or visit our sales gallery on Marine Drive, Colombo 03.`,
  };
}

export default async function ContactPage() {
  const { company, offices } = await getSiteSettings();
  const projects = (await getProjects()).filter((p) => p.status !== "done").map((p) => p.name);

  return (
    <>
      <PageHero crumb="Contact" title="Talk to us" lead="Our sales team answers calls and WhatsApp messages seven days a week, and replies to every email within one working day." />

      <section className={c.section}>
        <div className={c.split}>
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 1, background: "var(--color-divider)" }}>
              <a href={company.hotlineHref} style={{ display: "flex", flexDirection: "column", gap: 6, padding: 24, background: "var(--color-bg)", textDecoration: "none" }}>
                <IconPhone size={22} />
                <span className="label muted">Sales hotline</span>
                <span className="nums" style={{ fontFamily: "var(--font-heading)", fontSize: 30 }}>
                  {company.hotline}
                </span>
              </a>
              <a href={company.whatsappHref} target="_blank" rel="noopener" style={{ display: "flex", flexDirection: "column", gap: 6, padding: 24, background: "var(--color-bg)", textDecoration: "none" }}>
                <IconWhatsApp size={22} />
                <span className="label muted">WhatsApp</span>
                <span className="nums" style={{ fontFamily: "var(--font-heading)", fontSize: 30 }}>
                  {company.whatsapp}
                </span>
              </a>
            </div>
            <ul className={c.list}>
              <li>
                <span>Sales</span>
                <a href={`mailto:${company.email}`}>{company.email}</a>
              </li>
              <li>
                <span>Homeowner care</span>
                <a href="mailto:care@ovdc.lk">care@ovdc.lk</a>
              </li>
              <li>
                <span>Overseas buyers</span>
                <a href="mailto:global@ovdc.lk">global@ovdc.lk</a>
              </li>
              <li>
                <span>Careers</span>
                <Link href={routes.careers}>Open roles →</Link>
              </li>
            </ul>
            <h2 className="h-sub" style={{ marginTop: 16 }}>
              Send a message
            </h2>
            <ContactForm projects={projects} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ position: "relative", minHeight: 420, border: "1px solid var(--color-divider)" }}>
              <OfficesMap offices={offices} />
            </div>
            {offices.map((o) => (
              <div key={o.city} style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 16, borderTop: "2px solid var(--color-rule-strong)" }}>
                <span className="kicker">{o.label}</span>
                <span style={{ fontFamily: "var(--font-heading)", fontSize: 30, lineHeight: 1 }}>{o.city}</span>
                <span style={{ fontSize: 15, lineHeight: 1.6 }}>
                  {o.lines[0]}
                  <br />
                  {o.lines[1]}
                </span>
                <span className="muted" style={{ fontSize: 14 }}>
                  {o.hours}
                </span>
                <span style={{ display: "flex", gap: 20, flexWrap: "wrap", fontSize: 14 }}>
                  <a href={`tel:${o.phone.replace(/\s/g, "")}`} className="nums">
                    {o.phone}
                  </a>
                  <a href={`mailto:${o.email}`}>{o.email}</a>
                  <a href={`https://www.google.com/maps/dir/?api=1&destination=${o.lat},${o.lng}`} target="_blank" rel="noopener">
                    Directions ↗
                  </a>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={c.cta}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <span className="kicker">Prefer to see it?</span>
          <h2 style={{ fontSize: "clamp(32px, 3.6vw, 48px)", lineHeight: 1 }}>Book a time at the show apartment</h2>
        </div>
        <div className={c.ctaActions}>
          <Link className="btn btn-primary btn-lg" href={routes.bookVisit()}>
            Book a site visit<span aria-hidden>→</span>
          </Link>
          <Link className="btn btn-secondary on-dark btn-lg" href={routes.faq}>
            Read the FAQ
          </Link>
        </div>
      </section>
    </>
  );
}
