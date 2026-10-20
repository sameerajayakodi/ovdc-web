import type { Floor, PlateUnit, Unit, UnitStatus, UnitType } from "../types";

/** Ocean View Residences floor plate: six units per floor, A to F. */
export const PLATE: PlateUnit[] = [
  { u: "A", type: "Type A", beds: 2, label: "2 Bed", baths: 2, sqft: 1480, balcony: 160, facing: "West", view: "Sea" },
  { u: "B", type: "Type C", beds: 3, label: "3 Bed + study", baths: 3.5, sqft: 1980, balcony: 240, facing: "West", view: "Sea" },
  { u: "C", type: "Type B", beds: 2, label: "2 Bed + study", baths: 2.5, sqft: 1725, balcony: 190, facing: "North-west", view: "Sea" },
  { u: "D", type: "Type C", beds: 3, label: "3 Bed + study", baths: 3.5, sqft: 1980, balcony: 220, facing: "East", view: "City" },
  { u: "E", type: "Type A", beds: 2, label: "2 Bed", baths: 2, sqft: 1480, balcony: 160, facing: "East", view: "City" },
  { u: "F", type: "Type D", beds: 4, label: "4 Bed", baths: 4.5, sqft: 2650, balcony: 420, facing: "South-west", view: "Sea" },
];

const unitPrice = (floor: number, p: PlateUnit) =>
  Math.round((p.sqft * (47000 + floor * 40) * (p.view === "Sea" ? 1 : 0.98)) / 1e5) / 10;

/** Hand-set floors so the showcase units (14B, 14C) are always available. */
const OVERRIDE: Record<string, string> = { A14: "SAAARA", A5: "SRASAA" };

function buildTower(tower: string, top: number, notReleasedFrom: number): Floor[] {
  const floors: Floor[] = [];
  for (let f = 3; f <= top; f++) {
    const units: Unit[] = PLATE.map((p, i) => {
      let s: UnitStatus;
      if (f >= notReleasedFrom) s = "B";
      else {
        const h = (f * 7 + i * 13 + (tower === "B" ? 3 : 0)) % 10;
        const soldCut = f < 10 ? 6 : f < 17 ? 4 : 2;
        s = h < soldCut ? "S" : h < soldCut + 2 ? "R" : "A";
      }
      const o = OVERRIDE[tower + f];
      if (o) s = o[i] as UnitStatus;
      const price = unitPrice(f, p);
      if (s === "A" && price < 68.5) s = "S";
      return { ...p, id: `${f}${p.u}`, tower, floor: f, status: s, price };
    });
    const avail = units.filter((u) => u.status === "A");
    floors.push({
      n: f,
      units,
      available: avail.length,
      from: avail.length ? Math.min(...avail.map((u) => u.price)) : Infinity,
    });
  }
  return floors.reverse();
}

/** Live inventory per project slug → tower → floors (top floor first). */
export const inventory: Record<string, Record<string, Floor[]>> = {
  "ocean-view-residences": {
    A: buildTower("A", 24, 22),
    B: buildTower("B", 20, 12),
  },
};

const C_ROOMS = [
  { name: "Living & dining", dim: "7.2 × 5.4 m" },
  { name: "Kitchen", dim: "4.2 × 3.0 m" },
  { name: "Master bedroom", dim: "5.0 × 4.2 m" },
  { name: "Bedroom 2", dim: "4.0 × 3.6 m" },
  { name: "Bedroom 3", dim: "3.8 × 3.4 m" },
  { name: "Study", dim: "2.8 × 2.6 m" },
  { name: "Balcony", dim: "8.0 × 2.8 m" },
];

export const unitTypes: Record<string, UnitType[]> = {
  "ocean-view-residences": [
    {
      key: "A", type: "Type A", label: "2 Bed", sqft: 1480, balcony: 160, facing: "West", view: "Sea",
      rooms: [
        { name: "Living & dining", dim: "6.4 × 4.8 m" },
        { name: "Kitchen", dim: "3.6 × 2.8 m" },
        { name: "Master bedroom", dim: "4.4 × 3.8 m" },
        { name: "Bedroom 2", dim: "3.8 × 3.4 m" },
        { name: "Balcony", dim: "6.0 × 2.4 m" },
      ],
    },
    {
      key: "B", type: "Type B", label: "2 Bed + study", sqft: 1725, balcony: 190, facing: "North-west", view: "Sea",
      rooms: [
        { name: "Living & dining", dim: "6.8 × 5.0 m" },
        { name: "Kitchen", dim: "3.8 × 3.0 m" },
        { name: "Master bedroom", dim: "4.6 × 4.0 m" },
        { name: "Bedroom 2", dim: "3.8 × 3.4 m" },
        { name: "Study", dim: "2.6 × 2.4 m" },
        { name: "Balcony", dim: "7.0 × 2.6 m" },
      ],
    },
    {
      key: "C", type: "Type C", label: "3 Bed + study", sqft: 1980, balcony: 240, facing: "West", view: "Sea",
      rooms: C_ROOMS,
      tourId: "ovr-type-c",
    },
    {
      key: "D", type: "Type D", label: "4 Bed", sqft: 2650, balcony: 420, facing: "South-west", view: "Sea",
      rooms: [
        { name: "Living & dining", dim: "8.4 × 6.0 m" },
        { name: "Kitchen", dim: "4.6 × 3.4 m" },
        { name: "Master bedroom", dim: "5.4 × 4.6 m" },
        { name: "Bedrooms 2–4", dim: "4.0 × 3.8 m each" },
        { name: "Family room", dim: "4.2 × 3.6 m" },
        { name: "Wrap balcony", dim: "14.0 × 3.0 m" },
      ],
    },
  ],
};
