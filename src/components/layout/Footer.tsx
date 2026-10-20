import Link from "next/link";
import { company } from "@/lib/data/content";
import { routes } from "@/lib/routes";
import { IconFacebook, IconInstagram, IconLinkedIn, IconYouTube } from "@/components/ui/Icons";
import { NewsletterForm } from "./NewsletterForm";
import styles from "./Footer.module.css";

const cols = [
  {
    title: "Projects",
    links: [
      ["Ocean View Residences", routes.project("ocean-view-residences")],
      ["The Marine Crest", routes.project("the-marine-crest")],
      ["Lagoon Terraces", routes.project("lagoon-terraces")],
      ["Kandy Hill Villas", routes.project("kandy-hill-villas")],
      ["All projects", routes.projects],
    ],
  },
  {
    title: "Explore",
    links: [
      ["3D & 360° tours", routes.tours],
      ["Gallery", routes.gallery],
      ["Construction progress", routes.progress],
      ["Buyer’s guide", routes.buyersGuide],
      ["Overseas buyers", routes.overseas],
      ["Calculators", routes.calculators],
    ],
  },
  {
    title: "Company",
    links: [
      ["About us", routes.about],
      ["Awards", routes.awards],
      ["News", routes.news],
      ["Careers", routes.careers],
      ["FAQ", routes.faq],
      ["Customer portal", routes.portal],
    ],
  },
];

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.top}>
          <div className={styles.brand}>
            <span className={styles.mark}>OVDC</span>
            <span className="kicker kicker-on-navy" style={{ letterSpacing: ".2em" }}>
              {company.name}
            </span>
          </div>
          <NewsletterForm />
        </div>

        <div className={styles.cols}>
          {cols.map((c) => (
            <div key={c.title} className={styles.col}>
              <span className={styles.colTitle}>{c.title}</span>
              {c.links.map(([label, href]) => (
                <Link key={label} href={href} className={styles.link}>
                  {label}
                </Link>
              ))}
            </div>
          ))}
          <div className={styles.col}>
            <span className={styles.colTitle}>Head office</span>
            <span style={{ fontSize: 14, lineHeight: 1.6 }}>
              {company.address[0]}
              <br />
              {company.address[1]}
            </span>
            <a href={company.hotlineHref} className={styles.link}>
              Hotline {company.hotline}
            </a>
            <a href={company.whatsappHref} className={styles.link}>
              WhatsApp {company.whatsapp}
            </a>
            <a href={`mailto:${company.email}`} className={styles.link}>
              {company.email}
            </a>
            <div className={styles.social}>
              <a href="#" aria-label="Instagram">
                <IconInstagram />
              </a>
              <a href="#" aria-label="Facebook">
                <IconFacebook />
              </a>
              <a href="#" aria-label="YouTube">
                <IconYouTube />
              </a>
              <a href="#" aria-label="LinkedIn">
                <IconLinkedIn />
              </a>
            </div>
          </div>
        </div>

        <p className={styles.legal}>
          All projects are approved by the Urban Development Authority of Sri Lanka; approval numbers are listed on each
          project page. Images are artist’s impressions. Prices in currencies other than LKR are indicative and converted
          at daily rates; sale agreements are executed in LKR.
        </p>

        <div className={styles.bottom}>
          <span>
            © 2026 {company.name} · Reg. {company.reg} · {company.web}
          </span>
          <div className={styles.bottomLinks}>
            <Link href={routes.legal}>Privacy</Link>
            <Link href={routes.legal}>Terms</Link>
            <Link href={routes.legal}>Cookies</Link>
            <Link href={routes.credits}>Photo credits</Link>
            <a href="/sitemap.xml">Sitemap</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
