import type { HrStage } from "@/db/schema";

/** Website content constants shared by the admin pages and their Server Actions. */
export const POST_CATEGORIES = ["Construction", "Buying guide", "Lifestyle", "Company"] as const;

export const HR_STAGES: { k: HrStage; label: string }[] = [
  { k: "new", label: "New" },
  { k: "shortlisted", label: "Shortlisted" },
  { k: "interview", label: "Interview" },
  { k: "offer", label: "Offer" },
  { k: "rejected", label: "Rejected" },
];

export const SECTIONS = [
  { k: "news", label: "News & blog" },
  { k: "faq", label: "FAQ" },
  { k: "careers", label: "Careers" },
  { k: "testimonials", label: "Testimonials" },
  { k: "awards", label: "Awards" },
  { k: "forms", label: "Form submissions" },
] as const;
export type Section = (typeof SECTIONS)[number]["k"];
