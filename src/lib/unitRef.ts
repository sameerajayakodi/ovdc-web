import type { Unit } from "./types";

/** Unit reference format: "<tower>-<floor><letter>", e.g. "A-14B". */
export function parseUnitRef(ref: string) {
  const m = /^([A-Z])-(\d+)([A-Z])$/.exec(ref.toUpperCase());
  return m ? { tower: m[1], id: `${m[2]}${m[3]}` } : null;
}

export function unitRef(u: Pick<Unit, "tower" | "id">) {
  return `${u.tower}-${u.id}`;
}
