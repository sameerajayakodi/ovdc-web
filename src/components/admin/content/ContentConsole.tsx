"use client";

import Link from "next/link";
import type { AwardRow, FaqRow, HrStage, JobRow, LeadKind, PostRow, TestimonialRow } from "@/db/schema";
import { SECTIONS, type Section } from "@/lib/admin/content";
import { NewsEditor } from "./NewsEditor";
import { ListEditor, type Field } from "./ListEditor";
import { Careers } from "./Careers";
import { Forms } from "./Forms";
import s from "./content.module.css";

export type AdminPost = Omit<PostRow, "publishAt" | "updatedAt"> & { publishAt: string; updatedAt: string; coverUrl: string | null };
export type AdminJob = Omit<JobRow, "updatedAt"> & { updatedAt: string };
export interface Application {
  id: number;
  name: string;
  email: string;
  mobile: string;
  role: string;
  url: string;
  message: string;
  stage: HrStage;
  createdAt: string;
}
export interface FormRow {
  id: number;
  kind: LeadKind;
  name: string;
  email: string;
  mobile: string;
  message: string;
  interest: string;
  page: string;
  createdAt: string;
}

export type ContentData =
  | { section: "news"; posts: AdminPost[]; images: { id: number; name: string; url: string }[]; stock: { key: string; alt: string; src: string }[] }
  | { section: "faq"; rows: FaqRow[] }
  | { section: "testimonials"; rows: TestimonialRow[] }
  | { section: "awards"; rows: AwardRow[] }
  | { section: "careers"; jobs: AdminJob[]; apps: Application[] }
  | { section: "forms"; forms: FormRow[] };

const FAQ_FIELDS: Field[] = [
  { key: "group", label: "Group", kind: "text", list: "faq-groups", width: 200 },
  { key: "q", label: "Question", kind: "text", grow: true },
  { key: "a", label: "Answer", kind: "textarea", full: true },
  { key: "published", label: "On website", kind: "switch" },
];
const TESTIMONIAL_FIELDS: Field[] = [
  { key: "name", label: "Name", kind: "text", width: 260 },
  { key: "role", label: "Home", kind: "text", grow: true, placeholder: "Homeowner, Ward Place Residences" },
  { key: "quote", label: "Quote", kind: "textarea", full: true },
  { key: "published", label: "On website", kind: "switch" },
];
const AWARD_FIELDS: Field[] = [
  { key: "year", label: "Year", kind: "text", width: 90, placeholder: "2025" },
  { key: "title", label: "Award", kind: "text", grow: true },
  { key: "by", label: "Awarded by", kind: "text", width: 240 },
  { key: "project", label: "Project", kind: "text", width: 220, placeholder: "Optional" },
  { key: "shown", label: "On website", kind: "switch" },
];

export function ContentConsole({ data, badges, now }: { data: ContentData; badges: Partial<Record<Section, string>>; now: number }) {
  return (
    <div className={s.wrap}>
      <nav className={s.nav} aria-label="Website sections">
        <div className="ad-kicker" style={{ padding: "4px 12px 8px" }}>
          ovdc.lk
        </div>
        {SECTIONS.map((x) => (
          <Link key={x.k} href={`/admin/content?section=${x.k}`} aria-current={data.section === x.k ? "page" : undefined} className={s.navItem}>
            <span>{x.label}</span>
            {badges[x.k] && <span className={s.badge}>{badges[x.k]}</span>}
          </Link>
        ))}
      </nav>
      <div className={s.main}>
        {data.section === "news" && <NewsEditor posts={data.posts} images={data.images} stock={data.stock} now={now} />}
        {data.section === "faq" && (
          <ListEditor
            kind="faq"
            title="FAQ"
            sub="Questions on the FAQ page, grouped · drag order is the order on the site"
            rows={data.rows.map(({ group, q, a, published }) => ({ group, q, a, published }))}
            fields={FAQ_FIELDS}
            blank={{ group: data.rows[0]?.group ?? "Buying", q: "", a: "", published: true }}
            heading={(r) => String(r.q || "New question")}
            groups={[...new Set(data.rows.map((r) => r.group))]}
            viewHref="/faq"
          />
        )}
        {data.section === "testimonials" && (
          <ListEditor
            kind="testimonials"
            title="Testimonials"
            sub="Homeowner quotes on the home page"
            rows={data.rows.map(({ name, role, quote, published }) => ({ name, role, quote, published }))}
            fields={TESTIMONIAL_FIELDS}
            blank={{ name: "", role: "", quote: "", published: true }}
            heading={(r) => String(r.name || "New testimonial")}
            viewHref="/"
          />
        )}
        {data.section === "awards" && (
          <ListEditor
            kind="awards"
            title="Awards"
            sub="Industry recognition on the Awards page"
            rows={data.rows.map(({ year, title, by, project, shown }) => ({ year, title, by, project, shown }))}
            fields={AWARD_FIELDS}
            blank={{ year: String(new Date(now).getFullYear()), title: "", by: "", project: "", shown: true }}
            heading={(r) => `${r.year} · ${r.title || "New award"}`}
            viewHref="/awards"
          />
        )}
        {data.section === "careers" && <Careers jobs={data.jobs} apps={data.apps} now={now} />}
        {data.section === "forms" && <Forms forms={data.forms} now={now} />}
      </div>
    </div>
  );
}
