import type { PlanRoom } from "@/db/schema";
import type { Tour } from "@/lib/types";
import { planLayout } from "./planLayout";

/** The 360° tour minimap: rooms in a 200 × 140 plan space; a room's id is the key of the scene it opens. */
export type MiniRoom = Tour["planRooms"][number];
export const MAP_W = 200;
export const MAP_H = 140;

const r1 = (n: number) => Math.round(n * 10) / 10;
const words = (s: string) =>
  new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9 ]+/g, " ")
      .split(/\s+/)
      .filter((w) => w && !["room", "and", "the", "area"].includes(w)),
  );

/** The scene whose name shares the most words with the room's name ("Master bedroom" ↔ "Master Bedroom"). */
export function matchScene<S extends { key: string; name: string }>(room: string, scenes: S[], taken: Set<string> = new Set()) {
  const a = words(room);
  let best: S | undefined;
  let score = 0;
  for (const s of scenes) {
    if (taken.has(s.key)) continue;
    const n = [...words(s.name)].filter((w) => a.has(w)).length;
    if (n > score) [best, score] = [s, n];
  }
  return best;
}

export const roomId = (name: string, used: Set<string>) => {
  const base = `room-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "space"}`;
  let id = base;
  for (let i = 2; used.has(id); i++) id = `${base}-${i}`;
  return id;
};

/** Minimap rooms drawn from a floor plan layout's room sizes, each linked to the scene that matches its name. */
export function minimapFromPlan(rooms: PlanRoom[], scenes: { key: string; name: string }[]): MiniRoom[] {
  const valid = rooms.filter((r) => r.name && r.w > 0 && r.l > 0);
  if (!valid.length) return [];
  const { boxes, width, height } = planLayout(valid.map((r) => ({ name: r.name, dim: `${r.w} × ${r.l} m` })));
  const k = Math.min(MAP_W / width, MAP_H / height);
  const ox = (MAP_W - width * k) / 2;
  const oy = (MAP_H - height * k) / 2;
  const used = new Set<string>();
  return boxes.map((b) => {
    const id = matchScene(b.name, scenes, used)?.key ?? roomId(b.name, used);
    used.add(id);
    return { id, x: r1(ox + b.x * k), y: r1(oy + b.y * k), w: r1(b.w * k), h: r1(b.h * k), label: b.name.toUpperCase(), ...(b.outdoor ? { outdoor: true } : {}) };
  });
}

export const roomCentre = (r: MiniRoom): [number, number] => [r1(r.x + r.w / 2), r1(r.y + r.h / 2)];
