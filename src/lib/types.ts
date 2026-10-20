export type ProjectStatus = "uc" | "done" | "soon";

/** A = available, R = reserved, S = sold, B = blocked / not released */
export type UnitStatus = "A" | "R" | "S" | "B";

export type Currency = "LKR" | "USD" | "AUD" | "AED";

export interface Project {
  id: string;
  slug: string;
  name: string;
  loc: string;
  address: string;
  type: string;
  status: ProjectStatus;
  /** Starting price in LKR millions; null before launch or when sold out */
  from: number | null;
  /** Has at least one published 360° tour */
  tour: boolean;
  /** Has an interactive building explorer (live inventory) */
  explorer: boolean;
  progress: number;
  completion: string;
  uda: string;
  units: number;
  floors: number;
  towers: string;
  beds: string;
  available: number;
  lat: number;
  lng: number;
  blurb: string;
}

export interface PlateUnit {
  u: string;
  type: string;
  beds: number;
  label: string;
  baths: number;
  sqft: number;
  balcony: number;
  facing: string;
  view: "Sea" | "City";
}

export interface Unit extends PlateUnit {
  /** e.g. "14B" */
  id: string;
  tower: string;
  floor: number;
  status: UnitStatus;
  /** LKR millions */
  price: number;
}

export interface Floor {
  n: number;
  units: Unit[];
  available: number;
  /** Lowest available price on the floor (LKR Mn), Infinity when none */
  from: number;
}

export interface Room {
  name: string;
  dim: string;
}

export interface UnitType {
  key: string;
  type: string;
  label: string;
  sqft: number;
  balcony: number;
  facing: string;
  view: string;
  rooms: Room[];
  /** id of the 360° tour for this layout, if one is published */
  tourId?: string;
}

export interface PaymentStage {
  stage: string;
  pct: number;
  when: string;
}

export interface ProgressUpdate {
  month: string;
  pct: number;
  a: number;
  b: number;
  note: string;
}

export interface NearbyPlace {
  cat: string;
  name: string;
  min: number;
  mode: "walk" | "drive";
  lat: number;
  lng: number;
}

export interface TourHotspotNav {
  t: "nav";
  to: string;
  yaw: number;
  pitch: number;
}

export interface TourHotspotInfo {
  t: "info";
  id: string;
  yaw: number;
  pitch: number;
  kicker: string;
  title: string;
  body: string;
}

export interface TourScene {
  id: string;
  name: string;
  short: string;
  note: string;
  /** Position of the viewer on the minimap floor plan (SVG units) */
  plan: [number, number];
  /** Rotation applied to the panorama sphere (deg) */
  rot: number;
  /** Initial yaw (deg) */
  yaw: number;
  /** object-position for the filmstrip thumbnail */
  pos: string;
  /** Equirectangular panorama for this scene; falls back to the tour default */
  panorama?: string;
  /** Small 2:1 preview for the filmstrip */
  thumb?: string;
  hs: (TourHotspotNav | TourHotspotInfo)[];
}

export interface Tour {
  id: string;
  projectSlug: string;
  projectName: string;
  projectLoc: string;
  unitRef: string;
  title: string;
  typeLabel: string;
  floorLabel: string;
  interior: number;
  terrace: number;
  bedrooms: string;
  bathrooms: string;
  price: number;
  pricePerSqft: number;
  parking: string;
  status: UnitStatus;
  panorama: string;
  /** Minimap rooms in a 200 × 140 plan space; `id` matches a scene id */
  planRooms: { id: string; x: number; y: number; w: number; h: number; label: string; outdoor?: boolean }[];
  scenes: TourScene[];
}
