import { Building2, CalendarDays, FileSignature, Image as ImageIcon, Inbox, KeyRound, LayoutGrid, Map, PanelsTopLeft, Rotate3d, Settings, Users } from "lucide-react";
import { ago, dateTime, nowMs } from "@/lib/admin/format";
import type { ActivityItem } from "@/lib/admin/types";

const ICON = { unit: LayoutGrid, project: Building2, auth: KeyRound, lead: Inbox, visit: CalendarDays, media: ImageIcon, plan: Map, tour: Rotate3d, sale: FileSignature, customer: Users, content: PanelsTopLeft, settings: Settings };

function describe(a: ActivityItem) {
  const name = typeof a.detail.name === "string" ? a.detail.name : null;
  switch (a.entity) {
    case "unit":
      return (
        <>
          <strong>{a.ref.includes("units") ? a.ref : `Unit ${a.ref}`}</strong> · {a.action}
        </>
      );
    case "project":
      if (a.action === "seeded") return <>Sample data loaded · {String(a.detail.units ?? 0)} units</>;
      return (
        <>
          <strong>{name ?? a.ref}</strong> {a.action}
          {Array.isArray(a.detail.fields) && a.action === "updated" ? (
            <span className="ad-muted"> · {(a.detail.fields as string[]).slice(0, 4).join(", ")}</span>
          ) : null}
        </>
      );
    case "lead":
      return (
        <>
          <strong>{a.ref.includes("leads") ? a.ref : name || `Lead #${a.ref}`}</strong> · {a.action}
        </>
      );
    case "visit":
      return (
        <>
          Visit · <strong>{name ?? a.ref}</strong> {a.action}
        </>
      );
    case "media":
      return (
        <>
          Media · <strong>{name ?? a.ref}</strong> {a.action}
        </>
      );
    case "plan":
      return (
        <>
          Floor plan · <strong>{name ?? a.ref}</strong> {a.action}
        </>
      );
    case "sale":
      return (
        <>
          Sale · <strong>{name ?? a.ref}</strong> {a.action}
        </>
      );
    case "customer":
      return (
        <>
          Customer · <strong>{name ?? a.ref}</strong> {a.action}
        </>
      );
    case "content":
      return (
        <>
          Website · <strong>{name ?? a.ref}</strong> {a.action}
        </>
      );
    case "settings":
      return (
        <>
          Settings · <strong>{name ?? a.ref}</strong> {a.action}
        </>
      );
    case "tour":
      return (
        <>
          360° tour · <strong>{name ?? a.ref}</strong> {a.action}
        </>
      );
    default:
      return <>{a.action === "failed sign-in" ? <span style={{ color: "var(--a-danger-text)" }}>Failed sign-in attempt</span> : `Admin ${a.action}`}</>;
  }
}

export function ActivityFeed({ items, compact = false }: { items: ActivityItem[]; compact?: boolean }) {
  if (!items.length)
    return (
      <p className="ad-muted" style={{ padding: 16, margin: 0 }}>
        No changes yet.
      </p>
    );
  const now = nowMs();
  return (
    <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {items.map((a) => {
        const Icon = ICON[a.entity] ?? LayoutGrid;
        return (
          <li key={a.id} className="ad-row" style={{ alignItems: "flex-start" }}>
            <span style={{ color: "var(--a-gold-text)", marginTop: 2, display: "flex" }}>
              <Icon size={16} />
            </span>
            <div style={{ flex: 1, minWidth: 0, fontSize: 13, lineHeight: 1.45 }}>
              <div>{describe(a)}</div>
              <div className="ad-muted" style={{ fontSize: 11.5, marginTop: 2 }}>
                {a.actor} · <time dateTime={a.at} title={dateTime(a.at)}>{compact ? ago(a.at, now) : dateTime(a.at)}</time>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
