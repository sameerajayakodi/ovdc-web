"use client";

import { useId } from "react";
import type { Unit } from "@/lib/types";
import { UNIT_STATUS } from "@/lib/status";

/** Plate geometry for the Ocean View Residences typical floor (600 × 360 plan units). West (sea) is on the left. */
export const PLATE_GEOMETRY: Record<string, { x: number; y: number; w: number; h: number }> = {
  A: { x: 0, y: 0, w: 200, h: 130 },
  B: { x: 0, y: 130, w: 200, h: 130 },
  C: { x: 200, y: 0, w: 200, h: 100 },
  D: { x: 400, y: 0, w: 200, h: 150 },
  E: { x: 400, y: 150, w: 200, h: 110 },
  F: { x: 0, y: 260, w: 380, h: 100 },
};

const FILL = { A: "#3f6b55", R: "#c98a2b", S: "#67707c" } as const;

export function FloorPlate({
  units,
  selected,
  highlight,
  dim,
  onSelect,
  onHover,
  compact,
  dark = true,
}: {
  units: Unit[];
  selected?: string | null;
  /** ids to outline in gold (e.g. the unit being viewed) */
  highlight?: string[];
  /** ids that don't match the current filters */
  dim?: (u: Unit) => boolean;
  onSelect?: (u: Unit) => void;
  onHover?: (u: Unit | null) => void;
  compact?: boolean;
  dark?: boolean;
}) {
  const hatchId = `hatch${useId().replace(/:/g, "")}`;
  const ink = dark ? "#efe9dd" : "#0f1b2d";
  const mute = dark ? "rgba(239,233,221,.55)" : "rgba(15,27,45,.55)";
  const coreFill = dark ? "rgba(239,233,221,.06)" : "rgba(15,27,45,.06)";

  return (
    <svg viewBox="-34 -26 668 412" role="group" aria-label="Floor plate" style={{ width: "100%", height: "auto", display: "block" }}>
      <defs>
        <pattern id={hatchId} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="8" height="8" fill={dark ? "rgba(239,233,221,.06)" : "rgba(15,27,45,.06)"} />
          <line x1="0" y1="0" x2="0" y2="8" stroke={dark ? "rgba(239,233,221,.35)" : "rgba(15,27,45,.32)"} strokeWidth="2" />
        </pattern>
      </defs>
      {!compact && (
        <>
          <text x="-14" y="180" fill={mute} fontSize="11" fontWeight="600" letterSpacing="2" textAnchor="middle" transform="rotate(-90 -14 180)" fontFamily="var(--font-body)">
            INDIAN OCEAN · WEST
          </text>
          <text x="620" y="180" fill={mute} fontSize="11" fontWeight="600" letterSpacing="2" textAnchor="middle" transform="rotate(90 620 180)" fontFamily="var(--font-body)">
            CITY · EAST
          </text>
          <g transform="translate(615 -6)" fill={mute} fontSize="10" fontFamily="var(--font-body)">
            <path d="M0 -10 L5 4 L0 1 L-5 4 Z" fill="#c4a05a" />
            <text y="16" textAnchor="middle">
              N
            </text>
          </g>
        </>
      )}
      <rect x="200" y="100" width="200" height="160" fill={coreFill} stroke={mute} strokeWidth="1" />
      <text x="300" y="176" fill={mute} fontSize="11" textAnchor="middle" letterSpacing="1.5" fontFamily="var(--font-body)">
        LIFTS · STAIRS
      </text>
      <text x="300" y="192" fill={mute} fontSize="10" textAnchor="middle" fontFamily="var(--font-body)">
        lobby
      </text>
      <rect x="380" y="260" width="220" height="100" fill={coreFill} stroke={mute} strokeWidth="1" />
      <text x="490" y="314" fill={mute} fontSize="10" textAnchor="middle" letterSpacing="1.5" fontFamily="var(--font-body)">
        SERVICES
      </text>

      {units.map((u) => {
        const g = PLATE_GEOMETRY[u.u];
        if (!g) return null;
        const st = UNIT_STATUS[u.status];
        const isSel = selected === u.id;
        const isHi = highlight?.includes(u.id);
        const isDim = dim?.(u) ?? false;
        const fill = u.status === "B" ? `url(#${hatchId})` : FILL[u.status];
        const label = u.status === "R" ? "#0f1b2d" : u.status === "B" ? ink : "#ffffff";
        const interactive = !!onSelect;
        return (
          <g
            key={u.id}
            role={interactive ? "button" : undefined}
            tabIndex={interactive ? 0 : undefined}
            aria-label={`Unit ${u.id}, ${u.label}, ${st.label}`}
            aria-pressed={interactive ? isSel : undefined}
            style={{ cursor: interactive ? "pointer" : "default", opacity: isDim ? 0.28 : 1, transition: "opacity .2s" }}
            onClick={() => onSelect?.(u)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect?.(u);
              }
            }}
            onMouseEnter={() => onHover?.(u)}
            onMouseLeave={() => onHover?.(null)}
            onFocus={() => onHover?.(u)}
            onBlur={() => onHover?.(null)}
          >
            <rect x={g.x + 2} y={g.y + 2} width={g.w - 4} height={g.h - 4} fill={fill} stroke={isSel || isHi ? "#c4a05a" : dark ? "#0b1422" : "#f6f3ed"} strokeWidth={isSel || isHi ? 4 : 2} />
            <text x={g.x + 14} y={g.y + 28} fill={label} fontSize={compact ? 22 : 18} fontWeight="600" fontFamily="var(--font-body)">
              {u.id}
            </text>
            {!compact && (
              <>
                <text x={g.x + 14} y={g.y + 48} fill={label} fontSize="12" opacity=".9" fontFamily="var(--font-body)">
                  {u.label}
                </text>
                <text x={g.x + 14} y={g.y + 64} fill={label} fontSize="11" opacity=".8" fontFamily="var(--font-body)">
                  {u.sqft.toLocaleString("en-US")} sqft · {u.view}
                </text>
                <text x={g.x + g.w - 14} y={g.y + 28} fill={label} fontSize="14" fontWeight="700" textAnchor="end" fontFamily="var(--font-body)">
                  {st.k}
                </text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}
