import type { ProjectStatus, UnitStatus } from "./types";

export const UNIT_STATUS: Record<UnitStatus, { k: UnitStatus; label: string; fill: string; on: string; tint: string }> = {
  A: { k: "A", label: "Available", fill: "var(--status-available)", on: "var(--status-available-on)", tint: "var(--status-available-tint)" },
  R: { k: "R", label: "Reserved", fill: "var(--status-reserved)", on: "var(--status-reserved-on)", tint: "var(--status-reserved-tint)" },
  S: { k: "S", label: "Sold", fill: "var(--status-sold)", on: "var(--status-sold-on)", tint: "var(--status-sold-tint)" },
  B: { k: "B", label: "Not released", fill: "var(--status-blocked-hatch)", on: "var(--status-blocked-on)", tint: "var(--status-blocked-hatch)" },
};

/** Project badge colours: [background, foreground, border] */
export const PROJECT_BADGE: Record<ProjectStatus, [string, string, string]> = {
  done: ["var(--color-navy)", "var(--color-on-navy)", "0 solid transparent"],
  uc: ["var(--color-gold)", "var(--color-navy)", "0 solid transparent"],
  soon: ["var(--color-cream)", "var(--color-navy)", "1px solid var(--color-navy)"],
};
