import type { Room } from "@/lib/types";
import { planLayout } from "@/lib/planLayout";

/** Schematic floor plan drawn from room dimensions (architect’s PDF replaces it when available). */
export function FloorPlanSvg({ rooms, title }: { rooms: Room[]; title: string }) {
  const { boxes, width, height } = planLayout(rooms);
  const S = 46; // px per metre
  const pad = 28;
  const W = width * S + pad * 2;
  const H = height * S + pad * 2 + 26;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title} floor plan`} style={{ width: "100%", height: "100%" }}>
      <rect x="0" y="0" width={W} height={H} fill="#ffffff" />
      <g transform={`translate(${pad} ${pad})`} fontFamily="var(--font-body)">
        {boxes.map((b) => (
          <g key={b.name}>
            <rect
              x={b.x * S}
              y={b.y * S}
              width={b.w * S}
              height={b.h * S}
              fill={b.outdoor ? "#f3eee4" : "#fbfaf7"}
              stroke="#0f1b2d"
              strokeWidth={b.outdoor ? 1.5 : 3}
              strokeDasharray={b.outdoor ? "6 4" : undefined}
            />
            <text x={b.x * S + (b.w * S) / 2} y={b.y * S + (b.h * S) / 2 - 2} textAnchor="middle" fontSize="12" fontWeight="600" fill="#0f1b2d" letterSpacing=".06em">
              {b.name.toUpperCase()}
            </text>
            <text x={b.x * S + (b.w * S) / 2} y={b.y * S + (b.h * S) / 2 + 14} textAnchor="middle" fontSize="11" fill="#4b5563">
              {b.dim}
            </text>
          </g>
        ))}
        {/* door swings on the entrance side */}
        <path d={`M ${width * S - 46} 0 a 40 40 0 0 0 -40 40`} fill="none" stroke="#c4a05a" strokeWidth="1.5" />
        <g transform={`translate(0 ${height * S + 18})`} fill="#4b5563" fontSize="10">
          <rect x="0" y="0" width={S * 2} height="4" fill="#0f1b2d" />
          <text x={S * 2 + 8} y="6">
            2 m
          </text>
          <text x={width * S} y="6" textAnchor="end">
            Schematic · N ↑ · areas are approximate
          </text>
        </g>
      </g>
    </svg>
  );
}
