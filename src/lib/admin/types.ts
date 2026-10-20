import type { ProjectStatus, UnitStatus } from "@/lib/types";

/** Serializable shapes passed from admin Server Components to client UI. */
export interface AdminUnit {
  id: number;
  tower: string;
  floor: number;
  letter: string;
  code: string;
  type: string;
  beds: number;
  label: string;
  baths: number;
  sqft: number;
  balcony: number;
  facing: string;
  view: "Sea" | "City";
  status: UnitStatus;
  priceMn: number;
  note: string;
  updatedAt: string;
}

export interface PricePoint {
  priceMn: number;
  previousMn: number | null;
  changedBy: string;
  changedAt: string;
}

export interface AdminProject {
  id: string;
  slug: string;
  name: string;
  loc: string;
  address: string;
  type: string;
  status: ProjectStatus;
  fromMn: number | null;
  tour: boolean;
  explorer: boolean;
  progress: number;
  completion: string;
  uda: string;
  units: number;
  floors: number;
  towers: string;
  beds: string;
  availableManual: number;
  lat: number;
  lng: number;
  blurb: string;
  published: boolean;
  featured: boolean;
  sort: number;
  updatedAt: string;
  /** Live counts when the project has unit inventory */
  inventory: { A: number; R: number; S: number; B: number; total: number } | null;
}

export interface ActivityItem {
  id: number;
  at: string;
  actor: string;
  entity: "unit" | "project" | "auth";
  ref: string;
  action: string;
  detail: Record<string, unknown>;
}

export type ActionResult<T = undefined> = { ok: true; data?: T; message?: string } | { ok: false; error: string; fields?: Record<string, string> };
