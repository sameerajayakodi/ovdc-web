import { PROJECT_BADGE, UNIT_STATUS } from "@/lib/status";
import { PROJECT_STATUS } from "@/lib/data/projects";
import type { ProjectStatus, UnitStatus } from "@/lib/types";
import { Icon360 } from "./Icons";

/** Unit status tag: coloured letter square + label (never colour alone). */
export function UnitStatusTag({ status, compact }: { status: UnitStatus; compact?: boolean }) {
  const s = UNIT_STATUS[status];
  return (
    <span
      className="badge"
      style={{ padding: "0 10px 0 0", border: "1px solid var(--color-divider)", gap: 8, height: 28 }}
    >
      <span
        style={{
          display: "grid",
          placeItems: "center",
          width: 28,
          height: 28,
          margin: "-1px 0 -1px -1px",
          background: s.fill,
          color: s.on,
          fontSize: 12,
        }}
      >
        {s.k}
      </span>
      {!compact && s.label}
    </span>
  );
}

/** Small letter swatch used in legends, grids and tables. */
export function StatusSwatch({ status, size = 20 }: { status: UnitStatus; size?: number }) {
  const s = UNIT_STATUS[status];
  return (
    <span
      aria-hidden
      style={{
        display: "inline-grid",
        placeItems: "center",
        width: size,
        height: size,
        flex: "none",
        background: s.fill,
        color: s.on,
        fontSize: Math.round(size / 2),
        fontWeight: 600,
      }}
    >
      {s.k}
    </span>
  );
}

export function StatusLegend({ className }: { className?: string }) {
  return (
    <div className={className} style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12 }}>
      {(["A", "R", "S", "B"] as UnitStatus[]).map((k) => (
        <span key={k} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <StatusSwatch status={k} />
          {UNIT_STATUS[k].label}
        </span>
      ))}
    </div>
  );
}

export function ProjectBadge({ status, suffix }: { status: ProjectStatus; suffix?: string }) {
  const [bg, fg, border] = PROJECT_BADGE[status];
  return (
    <span className="badge" style={{ background: bg, color: fg, border }}>
      {PROJECT_STATUS[status]}
      {suffix}
    </span>
  );
}

export function TourBadge({ label = "360° Tour" }: { label?: string }) {
  return (
    <span className="badge badge-glass">
      <Icon360 />
      {label}
    </span>
  );
}
