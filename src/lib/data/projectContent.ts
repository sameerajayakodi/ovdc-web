import { amenityGroups, nearby, paymentPlan, progress, projectFaq, specs } from "./content";
import type { NearbyPlace, PaymentStage, ProgressUpdate } from "../types";

export interface ProjectContent {
  headline: string;
  subline: string;
  overview: string[];
  highlights: { v: string; l: string }[];
  amenityGroups?: { icon: string; name: string; items: string[] }[];
  specs?: { title: string; items: string[] }[];
  faq?: { q: string; a: string }[];
  nearby?: NearbyPlace[];
  payment?: { headline: string; exampleUnit: string; exampleMn: number; stages: PaymentStage[] };
  progress?: { towers: { name: string; pct: number }[]; updates: ProgressUpdate[] };
  brochure?: { pages: number; size: string };
}

/** Long-form project content (admin: Project editor). Projects without an entry show the essentials only. */
export const projectContent: Record<string, ProjectContent> = {
  "ocean-view-residences": {
    headline: "Two towers on the Mount Lavinia shoreline",
    subline: "Galle Road, Mount Lavinia · Two towers · 2–4 Bed apartments",
    overview: [
      "Ocean View Residences is 240 apartments across Tower A (24 floors) and Tower B (20 floors), set back from Galle Road and two minutes’ walk from Mount Lavinia Beach. Every living room faces the sea or the city skyline through 3.2m floor-to-ceiling glass.",
      "The podium holds a 25m infinity pool, a sky gym and a residents’ lounge; the roof has a sunset deck and BBQ terrace. Handover is scheduled for December 2027, with construction 62% complete as of October 2026.",
    ],
    highlights: [
      { v: "240", l: "Residences in two towers" },
      { v: "3.2m", l: "Floor-to-ceiling glass" },
      { v: "2 min", l: "Walk to the beach" },
      { v: "49", l: "Amenities" },
    ],
    amenityGroups,
    specs,
    faq: projectFaq,
    nearby,
    payment: { headline: "20% on booking, the rest as we build", exampleUnit: "Unit 14B, Type C", exampleMn: 94.2, stages: paymentPlan },
    progress: {
      towers: [
        { name: "Tower A", pct: 68 },
        { name: "Tower B", pct: 54 },
      ],
      updates: progress,
    },
    brochure: { pages: 40, size: "18 MB" },
  },
};
