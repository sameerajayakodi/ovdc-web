import type { ProjectStatus, UnitStatus } from "@/lib/types";
import type { LeadEventType, LeadKind, LeadStage, VisitStatus, VisitType } from "@/db/schema";

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
  entity: "unit" | "project" | "auth" | "lead" | "visit";
  ref: string;
  action: string;
  detail: Record<string, unknown>;
}

export interface AdminLead {
  id: number;
  createdAt: string;
  updatedAt: string;
  kind: LeadKind;
  source: string;
  stage: LeadStage;
  name: string;
  mobile: string;
  phoneKey: string;
  email: string;
  project: string;
  unit: string;
  interest: string;
  budget: string;
  message: string;
  url: string;
  page: string;
  visitDate: string;
  visitSlot: string;
  visitType: string;
  agent: string;
  followUpAt: string | null;
  respondedAt: string | null;
  lostReason: string;
  /** Next upcoming (not cancelled) visit */
  nextVisit: string | null;
  /** Other leads with the same phone number or email */
  dupes: number[];
}

export interface LeadEvent {
  id: number;
  at: string;
  actor: string;
  type: LeadEventType;
  text: string;
}

export interface AdminVisit {
  id: number;
  leadId: number;
  startsAt: string;
  durationMin: number;
  type: VisitType;
  location: string;
  project: string;
  party: number;
  agent: string;
  status: VisitStatus;
  note: string;
  bookedBy: string;
  createdAt: string;
  /** From the lead */
  name: string;
  mobile: string;
  email: string;
  stage: LeadStage;
}

export interface LeadDetail {
  lead: AdminLead;
  events: LeadEvent[];
  visits: AdminVisit[];
  dupes: { id: number; name: string; source: string; createdAt: string; kind: LeadKind }[];
}

export type ActionResult<T = undefined> = { ok: true; data?: T; message?: string } | { ok: false; error: string; fields?: Record<string, string> };
