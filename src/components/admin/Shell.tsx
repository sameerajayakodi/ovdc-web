"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  Building2,
  CalendarDays,
  ChevronRight,
  ExternalLink,
  FileSignature,
  History,
  Image as ImageIcon,
  Inbox,
  LayoutDashboard,
  LayoutGrid,
  Map,
  Menu,
  Moon,
  PanelLeft,
  PanelsTopLeft,
  Rotate3d,
  Search,
  Settings,
  Sun,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAdminUi, Wordmark } from "./AdminRoot";
import s from "./shell.module.css";

interface NavItem {
  href?: string;
  label: string;
  icon: LucideIcon;
}

const NAV: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/activity", label: "Activity log", icon: History },
    ],
  },
  {
    label: "Inventory",
    items: [
      { href: "/admin/projects", label: "Projects", icon: Building2 },
      { href: "/admin/units", label: "Units", icon: LayoutGrid },
      { label: "360° Tours", icon: Rotate3d },
      { label: "Floor plans", icon: Map },
      { label: "Media library", icon: ImageIcon },
    ],
  },
  {
    label: "Sales & CRM",
    items: [
      { label: "Leads", icon: Inbox },
      { label: "Site visits", icon: CalendarDays },
      { label: "Reservations & sales", icon: FileSignature },
      { label: "Customers", icon: Users },
    ],
  },
  {
    label: "Website",
    items: [
      { label: "Website content", icon: PanelsTopLeft },
      { label: "Settings", icon: Settings },
    ],
  },
];

function current(pathname: string) {
  for (const g of NAV)
    for (const it of g.items) {
      if (!it.href) continue;
      if (it.href === "/admin" ? pathname === "/admin" : pathname === it.href || pathname.startsWith(it.href + "/"))
        return { group: g.label, item: it };
    }
  return null;
}

const COLLAPSE_KEY = "ovdc.admin.sidebar";

export function Shell({ user, children }: { user: ReactNode; children: ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);
  const cur = current(pathname);

  // Close the mobile drawer after navigating.
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setDrawer(false);
  }

  useEffect(() => {
    try {
      // Restore the sidebar preference saved on this device.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (localStorage.getItem(COLLAPSE_KEY) === "1") setCollapsed(true);
    } catch {}
  }, []);

  const toggleCollapse = () => {
    if (window.matchMedia("(max-width: 960px)").matches) return setDrawer((d) => !d);
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1");
      } catch {}
      return !c;
    });
  };

  return (
    <div className={s.shell} data-collapsed={collapsed || undefined} data-drawer={drawer || undefined}>
      <aside className={s.side} aria-label="Admin navigation">
        <div className={s.sideHead}>
          {collapsed ? (
            <span className={s.mono}>O</span>
          ) : (
            <>
              <Wordmark size={28} />
              <span className="ad-tag ad-tag-neutral" style={{ marginLeft: "auto" }}>
                Admin
              </span>
            </>
          )}
          <button type="button" className={`ad-btn ad-btn-icon ${s.drawerClose}`} onClick={() => setDrawer(false)} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>
        <nav className={s.nav}>
          {NAV.map((g) => (
            <div key={g.label} className={s.group}>
              <div className={s.groupLabel}>{g.label}</div>
              {g.items.map((it) => {
                const Icon = it.icon;
                const on = cur?.item === it;
                if (!it.href)
                  return (
                    <span key={it.label} className={s.item} data-soon title={`${it.label} · coming soon`}>
                      <Icon size={17} strokeWidth={1.75} />
                      <span className={s.itemLabel}>{it.label}</span>
                      <span className={s.soon}>Soon</span>
                    </span>
                  );
                return (
                  <Link key={it.href} href={it.href} className={s.item} aria-current={on ? "page" : undefined} title={it.label}>
                    <Icon size={17} strokeWidth={1.75} />
                    <span className={s.itemLabel}>{it.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div className={s.user}>{user}</div>
      </aside>
      <div className={s.scrim} onClick={() => setDrawer(false)} aria-hidden="true" />
      <div className={s.main}>
        <header className={s.top}>
          <button type="button" className="ad-btn ad-btn-icon" onClick={toggleCollapse} aria-label="Toggle navigation">
            <span className={s.menuIcon}>
              <Menu size={18} />
            </span>
            <span className={s.panelIcon}>
              <PanelLeft size={18} />
            </span>
          </button>
          <div className={s.crumbs}>
            <span className="ad-muted">{cur?.group ?? "Admin"}</span>
            <ChevronRight size={14} />
            <span style={{ fontWeight: 700 }}>{cur?.item.label ?? "Console"}</span>
          </div>
          <div style={{ flex: 1 }} />
          <QuickSearch />
          <a className="ad-btn ad-btn-icon ad-btn-secondary" href="/" target="_blank" rel="noreferrer" title="Open ovdc.lk" aria-label="Open the website">
            <ExternalLink size={16} />
          </a>
          <ThemeButton />
        </header>
        <main className={s.content} id="admin-main">
          {children}
        </main>
      </div>
    </div>
  );
}

/** Jump to a unit ("A-14B") or search projects by name. */
function QuickSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  return (
    <form
      role="search"
      className={`ad-search ${s.search}`}
      onSubmit={(e) => {
        e.preventDefault();
        const v = q.trim();
        if (!v) return;
        const m = /^([A-Za-z])\s*-?\s*(\d{1,3}[A-Za-z])$/.exec(v);
        router.push(m ? `/admin/units?unit=${m[1].toUpperCase()}-${m[2].toUpperCase()}` : `/admin/projects?q=${encodeURIComponent(v)}`);
        setQ("");
      }}
    >
      <Search size={16} />
      <input
        className="ad-input"
        aria-label="Search units or projects"
        placeholder="Unit (A-14B) or project…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
    </form>
  );
}

export function ThemeButton() {
  const { theme, toggleTheme } = useAdminUi();
  return (
    <button
      type="button"
      className="ad-btn ad-btn-icon ad-btn-secondary"
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
    >
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
