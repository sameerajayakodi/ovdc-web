import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { articlePhoto, getArticle, getArticles } from "@/lib/api";
import { routes } from "@/lib/routes";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { ShortlistShare } from "@/components/project/ProjectActions";
import c from "@/components/content/content.module.css";

export async function generateStaticParams() {
  const articles = await getArticles();
  // At least one entry is required; a placeholder renders the 404 page.
  return articles.length ? articles.map((a) => ({ slug: a.slug })) : [{ slug: "none" }];
}

export async function generateMetadata({ params }: PageProps<"/news/[slug]">): Promise<Metadata> {
  const slug = (await params).slug;
  const a = await getArticle(slug);
  return a ? { title: a.title, description: a.dek, openGraph: { type: "article", publishedTime: a.date } } : {};
}

const fmt = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

export default function ArticlePage({ params }: PageProps<"/news/[slug]">) {
  return (
    <Suspense fallback={<div className="wrap skeleton" style={{ height: 600, marginTop: 40 }} />}>
      <Article params={params} />
    </Suspense>
  );
}

async function Article({ params }: { params: PageProps<"/news/[slug]">["params"] }) {
  const slug = (await params).slug;
  const a = await getArticle(slug);
  if (!a) notFound();
  const articles = await getArticles();
  const related = articles.filter((x) => x.slug !== a.slug && x.category === a.category).concat(articles.filter((x) => x.slug !== a.slug && x.category !== a.category)).slice(0, 3);

  return (
    <article>
      <header className="wrap" style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: "clamp(40px, 5vw, 72px)", paddingBottom: 32, maxWidth: 1040 }}>
        <Breadcrumbs items={[{ label: "News", href: routes.news }, { label: a.title }]} />
        <span className="kicker">
          {a.category} · <time dateTime={a.date}>{fmt(a.date)}</time> · {a.minutes} min read
        </span>
        <h1 style={{ fontSize: "clamp(40px, 5vw, 72px)", lineHeight: 1, textWrap: "balance" }}>{a.title}</h1>
        <p className="lead" style={{ fontSize: 19, maxWidth: "52ch" }}>
          {a.dek}
        </p>
        <ShortlistShare id={`article:${a.slug}`} name={a.title} path={routes.article(a.slug)} />
      </header>
      <div className="wrap">
        <div style={{ position: "relative", height: "clamp(240px, 40vw, 600px)" }}>
          <ImageSlot photo={articlePhoto(a)} priority sizes="100vw" />
        </div>
      </div>
      <div className={c.section} style={{ alignItems: "center" }}>
        <div className={c.prose} style={{ fontSize: 17 }}>
          {a.body.map((b, i) => (
            <div key={i} style={{ display: "contents" }}>
              {b.h && <h2>{b.h}</h2>}
              <p>{b.p}</p>
            </div>
          ))}
          <p style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--color-divider)" }}>
            Questions about this update? <Link href={routes.contact}>Contact our team</Link> or{" "}
            <Link href={routes.bookVisit()}>book a site visit</Link>.
          </p>
        </div>
      </div>
      <section className={`${c.section} ${c.surface}`}>
        <h2 className="h-sub">More from OVDC</h2>
        <div className={c.cards}>
          {related.map((r) => (
            <Link key={r.slug} href={routes.article(r.slug)} className={c.card}>
              <span className={`zoom ${c.media}`}>
                <ImageSlot photo={articlePhoto(r)} sizes="(max-width: 760px) 100vw, 33vw" />
              </span>
              <span className="kicker" style={{ color: "var(--color-kicker-sand)" }}>
                {r.category}
              </span>
              <h3 className={c.cardTitle}>{r.title}</h3>
            </Link>
          ))}
        </div>
      </section>
    </article>
  );
}
