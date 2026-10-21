import type { Metadata } from "next";
import { Suspense } from "react";
import { and, asc, count, desc, eq, gte, inArray, ne } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/admin/auth";
import { hasDb } from "@/lib/admin/queries";
import { getMediaOfKinds } from "@/lib/admin/contentQueries";
import { SECTIONS, type Section } from "@/lib/admin/content";
import { photos } from "@/lib/data/media";
import { nowMs } from "@/lib/admin/format";
import { ContentConsole, type ContentData } from "@/components/admin/content/ContentConsole";
import { DbMissing, PageSkeleton } from "@/components/admin/States";

export const metadata: Metadata = { title: "Website content" };

export default function ContentPage({ searchParams }: PageProps<"/admin/content">) {
  return (
    <Suspense fallback={<PageSkeleton rows={8} />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function Content({ searchParams }: Pick<PageProps<"/admin/content">, "searchParams">) {
  await requireAdmin();
  if (!hasDb() || !db) return <DbMissing />;
  const d = db;
  const sp = await searchParams;
  const section = SECTIONS.find((s) => s.k === one(sp.section))?.k ?? "news";
  const now = nowMs();
  const weekAgo = new Date(now - 7 * 86_400_000);

  const [[drafts], [newApps], [recentForms]] = await Promise.all([
    d.select({ n: count() }).from(schema.posts).where(eq(schema.posts.published, false)),
    d.select({ n: count() }).from(schema.leads).where(and(eq(schema.leads.kind, "application"), eq(schema.leads.hrStage, "new"))),
    d.select({ n: count() }).from(schema.leads).where(and(eq(schema.leads.source, "Website"), gte(schema.leads.createdAt, weekAgo))),
  ]);
  const badges: Partial<Record<Section, string>> = {
    ...(drafts.n ? { news: `${drafts.n} draft${drafts.n === 1 ? "" : "s"}` } : {}),
    ...(newApps.n ? { careers: `${newApps.n} new` } : {}),
    ...(recentForms.n ? { forms: `${recentForms.n} this week` } : {}),
  };

  let data: ContentData;
  if (section === "news") {
    const [rows, images] = await Promise.all([
      d.select({ post: schema.posts, cover: schema.media.url }).from(schema.posts).leftJoin(schema.media, eq(schema.media.id, schema.posts.coverMediaId)).orderBy(desc(schema.posts.publishAt)),
      getMediaOfKinds(["image"]),
    ]);
    data = {
      section,
      posts: rows.map(({ post: p, cover }) => ({ ...p, publishAt: p.publishAt.toISOString(), updatedAt: p.updatedAt.toISOString(), coverUrl: cover })),
      images: images.map((m) => ({ id: m.id, name: m.name, url: m.url })),
      stock: Object.entries(photos).map(([k, p]) => ({ key: k, alt: p.alt, src: p.src })),
    };
  } else if (section === "faq") {
    data = { section, rows: await d.select().from(schema.faqs).orderBy(asc(schema.faqs.sort), asc(schema.faqs.id)) };
  } else if (section === "testimonials") {
    data = { section, rows: await d.select().from(schema.testimonials).orderBy(asc(schema.testimonials.sort), asc(schema.testimonials.id)) };
  } else if (section === "awards") {
    data = { section, rows: await d.select().from(schema.awards).orderBy(asc(schema.awards.sort), asc(schema.awards.id)) };
  } else if (section === "careers") {
    const [jobs, apps] = await Promise.all([
      d.select().from(schema.jobs).orderBy(asc(schema.jobs.sort), asc(schema.jobs.id)),
      d
        .select({ id: schema.leads.id, name: schema.leads.name, email: schema.leads.email, mobile: schema.leads.mobile, role: schema.leads.interest, url: schema.leads.url, message: schema.leads.message, stage: schema.leads.hrStage, createdAt: schema.leads.createdAt })
        .from(schema.leads)
        .where(eq(schema.leads.kind, "application"))
        .orderBy(desc(schema.leads.createdAt))
        .limit(300),
    ]);
    data = { section, jobs: jobs.map((j) => ({ ...j, updatedAt: j.updatedAt.toISOString() })), apps: apps.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() })) };
  } else {
    const rows = await d
      .select({ id: schema.leads.id, kind: schema.leads.kind, name: schema.leads.name, email: schema.leads.email, mobile: schema.leads.mobile, message: schema.leads.message, interest: schema.leads.interest, page: schema.leads.page, createdAt: schema.leads.createdAt })
      .from(schema.leads)
      .where(and(eq(schema.leads.source, "Website"), ne(schema.leads.page, "admin"), inArray(schema.leads.kind, ["newsletter", "contact", "portal-access", "brochure", "enquiry", "site-visit", "reservation", "application"])))
      .orderBy(desc(schema.leads.createdAt))
      .limit(300);
    data = { section, forms: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })) };
  }

  return <ContentConsole key={section} data={data} badges={badges} now={now} />;
}
