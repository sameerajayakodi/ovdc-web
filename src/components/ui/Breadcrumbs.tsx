import Link from "next/link";
import s from "./Breadcrumbs.module.css";

export type Crumb = { label: string; href?: string };

/**
 * Breadcrumb trail. Desktop shows the full path; phones show a single
 * "back to parent" link so long trails never wrap. Emits BreadcrumbList JSON-LD.
 */
export function Breadcrumbs({ items, tone = "light", className }: { items: Crumb[]; tone?: "light" | "dark"; className?: string }) {
  const trail: Crumb[] = [{ label: "Home", href: "/" }, ...items];
  const parent = [...trail].reverse().find((c, i) => i > 0 && c.href);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      ...(c.href ? { item: `https://ovdc.lk${c.href}` } : {}),
    })),
  };

  return (
    <nav aria-label="Breadcrumb" className={`${s.nav} ${tone === "dark" ? s.dark : ""} ${className ?? ""}`}>
      <ol className={s.list}>
        {trail.map((c, i) => {
          const last = i === trail.length - 1;
          return (
            <li key={`${c.label}-${i}`} className={s.item}>
              {c.href && !last ? (
                <Link href={c.href} className={s.link}>
                  {i === 0 ? (
                    <>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z" />
                      </svg>
                      <span className="sr-only">Home</span>
                    </>
                  ) : (
                    c.label
                  )}
                </Link>
              ) : (
                <span className={s.current} aria-current={last ? "page" : undefined}>
                  {c.label}
                </span>
              )}
              {!last && (
                <svg className={s.sep} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
                  <path d="m9 6 6 6-6 6" />
                </svg>
              )}
            </li>
          );
        })}
      </ol>
      {parent && (
        <Link href={parent.href!} className={s.back}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="m15 6-6 6 6 6" />
          </svg>
          {parent.label === "Home" ? "Home" : parent.label}
        </Link>
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </nav>
  );
}
