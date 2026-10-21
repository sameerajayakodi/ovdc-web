import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getRole, getRoles } from "@/lib/api";
import { routes } from "@/lib/routes";
import { SimpleLeadForm } from "@/components/content/SimpleLeadForm";
import c from "@/components/content/content.module.css";

export async function generateStaticParams() {
  const roles = await getRoles();
  // At least one entry is required; a placeholder renders the 404 page.
  return roles.length ? roles.map((r) => ({ slug: r.slug })) : [{ slug: "none" }];
}

export async function generateMetadata({ params }: PageProps<"/careers/[slug]">): Promise<Metadata> {
  const slug = (await params).slug;
  const r = await getRole(slug);
  return r ? { title: `${r.title} · Careers`, description: r.summary } : {};
}

export default function RolePage({ params }: PageProps<"/careers/[slug]">) {
  return (
    <Suspense fallback={<div className="wrap skeleton" style={{ height: 600, marginTop: 40 }} />}>
      <Role params={params} />
    </Suspense>
  );
}

async function Role({ params }: { params: PageProps<"/careers/[slug]">["params"] }) {
  const slug = (await params).slug;
  const r = await getRole(slug);
  if (!r) notFound();
  return (
    <>
      <header className="wrap" style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: "clamp(40px, 5vw, 72px)", paddingBottom: 32, borderBottom: "2px solid var(--color-rule-strong)" }}>
        <Breadcrumbs items={[{ label: "Careers", href: routes.careers }, { label: r.title }]} />
        <span className="kicker">
          {r.team} · {r.location} · {r.type}
        </span>
        <h1 className="h-page">{r.title}</h1>
        <p className="lead" style={{ maxWidth: "56ch" }}>
          {r.summary}
        </p>
      </header>
      <section className={c.section}>
        <div className={c.split}>
          <div className={c.prose}>
            <h2>What you’ll do</h2>
            <ul>
              {r.duties.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
            <h2>What you’ll bring</h2>
            <ul>
              {r.needs.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
            <h2>What we offer</h2>
            <ul>
              <li>Competitive salary, performance bonus and medical cover</li>
              <li>Training and support towards professional chartership</li>
              <li>Work on landmark projects along the coast</li>
            </ul>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: "clamp(24px, 3vw, 36px)", background: "var(--color-surface)" }}>
            <span className="kicker" style={{ color: "var(--color-kicker-sand)" }}>
              Apply
            </span>
            <h2 className="h-sub">Apply for this role</h2>
            <SimpleLeadForm
              kind="application"
              context={{ interest: r.title }}
              submitLabel="Send application"
              doneTitle="Application received"
              doneBody="Thank you. Please email your CV to careers@ovdc.lk with the role in the subject line; we reply to every applicant within two weeks."
              fields={[
                { name: "name", label: "Full name", required: true },
                { name: "email", label: "Email", type: "email", required: true },
                { name: "mobile", label: "Mobile", type: "tel", required: true },
                { name: "url", label: "LinkedIn or portfolio link", type: "url", full: true, placeholder: "https://" },
                { name: "message", label: "Why this role?", type: "textarea", full: true },
              ]}
            />
            <p className="subtle" style={{ fontSize: 12 }}>
              Attach your CV by email to <a href={`mailto:careers@ovdc.lk?subject=${encodeURIComponent(r.title)}`}>careers@ovdc.lk</a>.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
