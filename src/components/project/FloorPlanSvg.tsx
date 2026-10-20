import type { Room } from "@/lib/types";

type Box = { name: string; dim: string; w: number; h: number; x: number; y: number; outdoor: boolean };

function parseDim(dim: string): [number, number] {
  const m = /([\d.]+)\s*×\s*([\d.]+)/.exec(dim);
  return m ? [parseFloat(m[1]), parseFloat(m[2])] : [3, 3];
}

/** Shelf-pack rooms into rows (largest first); outdoor spaces run along the bottom. */
function layout(rooms: Room[]) {
  const indoor: Box[] = [];
  const outdoor: Box[] = [];
  rooms.forEach((r) => {
    const [a, b] = parseDim(r.dim);
    const box = { name: r.name, dim: r.dim, w: Math.max(a, b), h: Math.min(a, b), x: 0, y: 0, outdoor: /balcony|terrace/i.test(r.name) };
    (box.outdoor ? outdoor : indoor).push(box);
  });
  const area = indoor.reduce((n, b) => n + b.w * b.h, 0);
  const maxW = Math.max(Math.sqrt(area) * 1.45, ...indoor.map((b) => b.w));
  indoor.sort((p, q) => q.h * q.w - p.h * p.w);

  let x = 0;
  let y = 0;
  let rowH = 0;
  let width = 0;
  const rows: Box[][] = [[]];
  for (const b of indoor) {
    if (x + b.w > maxW + 0.01 && x > 0) {
      y += rowH;
      x = 0;
      rowH = 0;
      rows.push([]);
    }
    b.x = x;
    b.y = y;
    x += b.w;
    rowH = Math.max(rowH, b.h);
    width = Math.max(width, x);
    rows[rows.length - 1].push(b);
  }
  // Stretch each row to the full width and equalise heights so walls line up.
  let yy = 0;
  for (const row of rows) {
    const rw = row.reduce((n, b) => n + b.w, 0);
    const rh = Math.max(...row.map((b) => b.h));
    let xx = 0;
    for (const b of row) {
      b.w = (b.w / rw) * width;
      b.x = xx;
      b.y = yy;
      b.h = rh;
      xx += b.w;
    }
    yy += rh;
  }
  let ox = 0;
  const outW = outdoor.reduce((n, b) => n + b.w, 0) || 1;
  for (const b of outdoor) {
    b.w = (b.w / outW) * width;
    b.x = ox;
    b.y = yy;
    ox += b.w;
  }
  const height = yy + (outdoor.length ? Math.max(...outdoor.map((b) => b.h)) : 0);
  return { boxes: [...indoor, ...outdoor], width, height };
}

/** Schematic floor plan drawn from room dimensions (architect’s PDF replaces it when available). */
export function FloorPlanSvg({ rooms, title }: { rooms: Room[]; title: string }) {
  const { boxes, width, height } = layout(rooms);
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
