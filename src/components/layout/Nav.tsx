"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { usePrefs } from "@/components/providers/Preferences";
import { CURRENCIES, CURRENCY_NAMES, money } from "@/lib/money";
import { mainNav, routes } from "@/lib/routes";
import type { Project } from "@/lib/types";
import { company } from "@/lib/data/content";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { photos, projectPhoto } from "@/lib/data/media";
import { IconChevronDown, IconClose, IconHeart, IconMenu } from "@/components/ui/Icons";
import styles from "./Nav.module.css";

type NavProject = Pick<Project, "id" | "slug" | "name" | "loc" | "status" | "from">;

const LANGS = [
  { k: "en", label: "English", short: "EN", ready: true },
  { k: "si", label: "සිංහල", short: "සි", ready: false },
  { k: "ta", label: "தமிழ்", short: "த", ready: false },
];

const COLS: [Project["status"], string][] = [
  ["uc", "Under construction"],
  ["soon", "Upcoming"],
  ["done", "Completed"],
];

function Wordmark() {
  return (
    <Link href={routes.home} aria-label="OVDC home" className={styles.brand}>
      <span className={styles.brandMark}>OVDC</span>
      <span className={styles.brandLine}>Ocean View Development Company</span>
    </Link>
  );
}

/** Static bar shown only while a page with unknown URL data streams in. */
export function NavFallback() {
  return (
    <div className={`${styles.root} ${styles.solid}`}>
      <header className={styles.bar}>
        <Wordmark />
      </header>
    </div>
  );
}

export function Nav({ projects }: { projects: NavProject[] }) {
  const pathname = usePathname();
  const overlay = pathname === "/";
  const { currency, setCurrency, toast, shortlist } = usePrefs();
  const saved = shortlist.filter((x) => x.startsWith("unit:") || x.startsWith("project:")).length;
  const [mega, setMega] = useState(false);
  const [menu, setMenu] = useState(false);
  const [curOpen, setCurOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [mProj, setMProj] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close everything on navigation (state adjusted during render, not in an effect).
  const [path, setPath] = useState(pathname);
  if (path !== pathname) {
    setPath(pathname);
    setMega(false);
    setMenu(false);
    setCurOpen(false);
    setLangOpen(false);
  }

  // Close popovers on outside click / Escape.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setCurOpen(false);
        setLangOpen(false);
        setMega(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setCurOpen(false);
        setLangOpen(false);
        setMega(false);
        setMenu(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = menu ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menu]);

  const active = pathname.startsWith("/projects/ocean-view-residences/explorer")
    ? "residences"
    : pathname.startsWith("/projects")
      ? "projects"
      : pathname.startsWith("/3d-tours")
        ? "3d"
        : pathname.split("/")[1];

  const cols = COLS.map(([k, label]) => {
    const items = projects.filter((p) => p.status === k);
    return {
      label,
      count: String(items.length).padStart(2, "0"),
      items: items.map((p) => ({
        ...p,
        price: p.from ? `from ${money(p.from, currency)}` : k === "done" ? "Sold out" : "Register interest",
      })),
    };
  });

  const pickLang = (l: (typeof LANGS)[number]) => {
    setLangOpen(false);
    if (!l.ready) toast(`${l.label} version is being translated — coming soon`);
  };

  return (
    <div ref={rootRef} className={`${styles.root} ${overlay ? styles.overlay : styles.solid}`}>
      <header className={styles.bar}>
        <Wordmark />

        <nav aria-label="Main" className={styles.links}>
          <button
            type="button"
            className={styles.link}
            data-on={mega || active === "projects" || undefined}
            aria-expanded={mega}
            onMouseEnter={() => {
              setMega(true);
              setCurOpen(false);
              setLangOpen(false);
            }}
            onClick={() => setMega((v) => !v)}
          >
            Projects
            <IconChevronDown />
          </button>
          {mainNav.map((l) => (
            <Link
              key={l.k}
              href={l.href}
              className={styles.link}
              data-on={active === l.k || undefined}
              aria-current={active === l.k ? "page" : undefined}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <Link href={routes.shortlist} className={styles.heart} aria-label={`Shortlist, ${saved} saved`}>
          <IconHeart filled={saved > 0} />
          {saved > 0 && <span className={styles.heartCount}>{saved}</span>}
        </Link>

        <div className={styles.switchers}>
          <div className={styles.pop}>
            <button
              type="button"
              className={styles.switch}
              aria-haspopup="listbox"
              aria-expanded={curOpen}
              aria-label={`Currency: ${currency}`}
              onClick={() => {
                setCurOpen((v) => !v);
                setLangOpen(false);
                setMega(false);
              }}
            >
              {currency}
              <IconChevronDown size={10} />
            </button>
            {curOpen && (
              <div role="listbox" aria-label="Currency" className={styles.menu}>
                {CURRENCIES.map((c) => (
                  <button
                    key={c}
                    role="option"
                    aria-selected={c === currency}
                    className={styles.option}
                    onClick={() => {
                      setCurrency(c);
                      setCurOpen(false);
                    }}
                  >
                    {c}
                    <span>{CURRENCY_NAMES[c]}</span>
                  </button>
                ))}
                <span className={styles.menuNote}>Indicative rates. Contracts are in LKR.</span>
              </div>
            )}
          </div>
          <div className={styles.pop}>
            <button
              type="button"
              className={styles.switch}
              aria-haspopup="listbox"
              aria-expanded={langOpen}
              aria-label="Language: English"
              onClick={() => {
                setLangOpen((v) => !v);
                setCurOpen(false);
                setMega(false);
              }}
            >
              EN
              <IconChevronDown size={10} />
            </button>
            {langOpen && (
              <div role="listbox" aria-label="Language" className={styles.menu} style={{ minWidth: 200 }}>
                {LANGS.map((l) => (
                  <button key={l.k} role="option" aria-selected={l.k === "en"} className={styles.option} onClick={() => pickLang(l)}>
                    <span lang={l.k} style={{ fontSize: 15, color: "var(--color-navy)" }}>
                      {l.label}
                    </span>
                    <span>{l.ready ? "✓" : "Soon"}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <Link className={`btn btn-primary ${styles.cta}`} href={routes.bookVisit()}>
          Book a visit<span aria-hidden>→</span>
        </Link>

        <div className={styles.mobileBtns}>
          {saved > 0 && (
            <Link href={routes.shortlist} className={styles.mBtn} aria-label={`Shortlist, ${saved} saved`}>
              <IconHeart filled />
              {saved}
            </Link>
          )}
          <button
            type="button"
            className={styles.mBtn}
            aria-label={`Currency: ${currency}`}
            aria-expanded={curOpen}
            onClick={() => setCurOpen((v) => !v)}
          >
            {currency}
          </button>
          <button type="button" className={styles.mBtn} aria-expanded={menu} onClick={() => setMenu(true)}>
            <span className={styles.mLabel}>Menu</span>
            <IconMenu />
          </button>
          {curOpen && (
            <div role="listbox" aria-label="Currency" className={styles.menu} style={{ right: 0, top: 56 }}>
              {CURRENCIES.map((c) => (
                <button
                  key={c}
                  role="option"
                  aria-selected={c === currency}
                  className={styles.option}
                  onClick={() => {
                    setCurrency(c);
                    setCurOpen(false);
                  }}
                >
                  {c}
                  <span>{CURRENCY_NAMES[c]}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {mega && (
        <div className={styles.mega} data-theme="light" onMouseLeave={() => setMega(false)}>
          {cols.map((col) => (
            <div key={col.label} className={styles.megaCol}>
              <div className={styles.megaHead}>
                <span className="kicker" style={{ letterSpacing: ".14em" }}>
                  {col.label}
                </span>
                <span className="nums muted" style={{ fontSize: 12 }}>
                  {col.count}
                </span>
              </div>
              {col.items.map((p) => (
                <Link key={p.id} href={routes.project(p.slug)} className={styles.megaItem}>
                  <span className={`zoom ${styles.megaThumb}`}>
                    <ImageSlot photo={photos[projectPhoto[p.slug] ?? "towerBeach"]} alt="" sizes="72px" />
                  </span>
                  <span className={styles.megaText}>
                    <span className={styles.megaName}>{p.name}</span>
                    <span className="muted" style={{ fontSize: 12 }}>
                      {p.loc} · {p.price}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          ))}
          <div className={styles.megaFeature}>
            <div className="zoom" style={{ position: "relative", aspectRatio: "4/3" }}>
              <ImageSlot photo={photos.heroPool} sizes="360px" />
            </div>
            <span className="kicker" style={{ letterSpacing: ".14em" }}>
              Now selling · Mount Lavinia
            </span>
            <span style={{ fontFamily: "var(--font-heading)", fontSize: 30, lineHeight: 1.05 }}>Ocean View Residences</span>
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
              <Link className="btn btn-ghost" href={routes.projects}>
                All projects
              </Link>
              <Link className="btn btn-ghost" href={routes.explorer("ocean-view-residences")}>
                Building explorer
              </Link>
              <Link className="btn btn-ghost" href={routes.tour("ovr-type-c")}>
                360° tour
              </Link>
            </div>
            <span className={styles.megaFoot}>
              Sales hotline{" "}
              <a href={company.hotlineHref} style={{ color: "var(--color-navy)", fontWeight: 600 }}>
                {company.hotline}
              </a>
            </span>
          </div>
        </div>
      )}

      {menu && (
        <div role="dialog" aria-modal="true" aria-label="Menu" className={styles.drawer}>
          <div className={styles.drawerHead}>
            <span className={styles.brand}>
              <span className={styles.brandMark}>OVDC</span>
              <span className={styles.brandLine}>Ocean View Development Company</span>
            </span>
            <button type="button" className={styles.mBtn} aria-label="Close menu" onClick={() => setMenu(false)}>
              <IconClose />
            </button>
          </div>
          <button type="button" className={styles.drawerLink} aria-expanded={mProj} onClick={() => setMProj((v) => !v)}>
            Projects<span className={styles.drawerSign}>{mProj ? "−" : "+"}</span>
          </button>
          {mProj && (
            <div className={styles.drawerSub}>
              {cols.map((col) => (
                <div key={col.label} style={{ display: "contents" }}>
                  <span className="kicker kicker-on-navy" style={{ padding: "14px 0 6px", letterSpacing: ".14em" }}>
                    {col.label}
                  </span>
                  {col.items.map((p) => (
                    <Link key={p.id} href={routes.project(p.slug)} className={styles.drawerSubItem}>
                      {p.name}
                      <span>{p.loc}</span>
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          )}
          {mainNav.map((l) => (
            <Link key={l.k} href={l.href} className={styles.drawerLink}>
              {l.label}
              <span className={styles.drawerSign} style={{ fontSize: 18 }}>
                →
              </span>
            </Link>
          ))}
          <div className={styles.drawerPrefs}>
            <span className="kicker kicker-on-navy" style={{ letterSpacing: ".14em" }}>
              Currency
            </span>
            <div className={styles.drawerGrid} style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
              {CURRENCIES.map((c) => (
                <button key={c} type="button" aria-pressed={c === currency} onClick={() => setCurrency(c)}>
                  {c}
                </button>
              ))}
            </div>
            <span className="kicker kicker-on-navy" style={{ letterSpacing: ".14em", paddingTop: 6 }}>
              Language
            </span>
            <div className={styles.drawerGrid} style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
              {LANGS.map((l) => (
                <button key={l.k} type="button" lang={l.k} aria-pressed={l.k === "en"} onClick={() => pickLang(l)}>
                  {l.label}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.drawerCtas}>
            <Link className="btn btn-primary btn-block" href={routes.bookVisit()}>
              Book a site visit<span aria-hidden>→</span>
            </Link>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <a className="btn btn-secondary on-dark btn-block" href={company.hotlineHref}>
                Call<span aria-hidden>↗</span>
              </a>
              <a className="btn btn-secondary on-dark btn-block" href={company.whatsappHref}>
                WhatsApp<span aria-hidden>↗</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
