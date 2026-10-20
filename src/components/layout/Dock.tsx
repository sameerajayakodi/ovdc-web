"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePrefs } from "@/components/providers/Preferences";
import { company } from "@/lib/data/content";
import { routes } from "@/lib/routes";
import { IconWhatsApp } from "@/components/ui/Icons";
import styles from "./Dock.module.css";

/** Cookie consent + WhatsApp button. Stacked on mobile so they never overlap. */
export function Dock({ hideWhatsApp }: { hideWhatsApp?: boolean }) {
  const { cookieConsent, setCookieConsent } = usePrefs();
  // Project and unit pages have their own Call / WhatsApp / Enquire bar on small screens.
  const pathname = usePathname();
  const hasActionBar = /^\/projects\/[^/]+(\/units\/[^/]+)?\/?$/.test(pathname);
  // The explorer is a full-screen workspace with its own actions; a floating button would cover the units list.
  const hideFloating = hideWhatsApp || pathname.endsWith("/explorer");
  const showCookie = cookieConsent === "pending";

  return (
    <div className={styles.dock}>
      <div className={styles.inner}>
        {showCookie && (
          <div role="region" aria-label="Cookie consent" data-theme="light" className={styles.cookie}>
            <span style={{ fontSize: 14, lineHeight: 1.5 }}>
              We use cookies to remember your currency and shortlist, and to measure how the site is used.{" "}
              <Link href={routes.legal}>Cookie policy</Link>
            </span>
            <div style={{ display: "flex", gap: 8, flex: "none" }}>
              <button className="btn btn-primary" style={{ minHeight: 44 }} onClick={() => setCookieConsent("all")}>
                Accept all
              </button>
              <button className="btn btn-secondary" style={{ minHeight: 44 }} onClick={() => setCookieConsent("essential")}>
                Essential only
              </button>
            </div>
          </div>
        )}
        {!hideFloating && (
          <a href={company.whatsappHref} aria-label="Chat with sales on WhatsApp" className={`${styles.wa} ${hasActionBar ? styles.waDesktopOnly : ""}`} target="_blank" rel="noopener">
            <span className={styles.waIcon}>
              <IconWhatsApp stroke="var(--color-white)" />
            </span>
            <span className={styles.waText}>
              <span className="kicker kicker-on-navy" style={{ fontSize: 10, letterSpacing: ".14em" }}>
                WhatsApp
              </span>
              <span style={{ fontSize: 14 }}>Chat with sales</span>
            </span>
          </a>
        )}
      </div>
    </div>
  );
}
