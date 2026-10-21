import type { Room } from "@/lib/types";

/** A room placed on the schematic plan, in metres from the top-left corner. */
export type PlanBox = { name: string; dim: string; w: number; h: number; x: number; y: number; outdoor: boolean };

function parseDim(dim: string): [number, number] {
  const m = /([\d.]+)\s*×\s*([\d.]+)/.exec(dim);
  return m ? [parseFloat(m[1]), parseFloat(m[2])] : [3, 3];
}

/**
 * Shelf-packs rooms into rows (largest first); outdoor spaces run along the bottom.
 * Used by the floor plan drawing and by the 360° tour minimap, so both show the same plan.
 */
export function planLayout(rooms: Room[]) {
  const indoor: PlanBox[] = [];
  const outdoor: PlanBox[] = [];
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
  const rows: PlanBox[][] = [[]];
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
  // Only outdoor spaces: they set the width themselves.
  if (!width) width = outdoor.reduce((n, b) => n + b.w, 0);
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
