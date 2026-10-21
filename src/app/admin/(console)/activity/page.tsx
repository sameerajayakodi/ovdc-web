import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/admin/auth";
import { getActivity, hasDb } from "@/lib/admin/queries";
import { ActivityFeed } from "@/components/admin/ActivityFeed";
import { DbMissing, PageSkeleton } from "@/components/admin/States";
import type { ActivityItem } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Activity log" };

const FILTERS: [string, string][] = [
  ["all", "All"],
  ["unit", "Units"],
  ["project", "Projects"],
  ["lead", "Leads"],
  ["visit", "Visits"],
  ["tour", "Tours"],
  ["plan", "Floor plans"],
  ["media", "Media"],
  ["sale", "Sales"],
  ["customer", "Customers"],
  ["content", "Website"],
  ["settings", "Settings"],
  ["auth", "Sign-ins"],
];

export default function ActivityPage({ searchParams }: PageProps<"/admin/activity">) {
  return (
    <Suspense fallback={<PageSkeleton rows={12} />}>
      <Activity searchParams={searchParams} />
    </Suspense>
  );
}

async function Activity({ searchParams }: Pick<PageProps<"/admin/activity">, "searchParams">) {
  await requireAdmin();
  if (!hasDb()) return <DbMissing />;
  const { type } = await searchParams;
  const entity = (["unit", "project", "lead", "visit", "tour", "plan", "media", "sale", "customer", "content", "settings", "auth"] as const).find((e) => e === type);
  const items: ActivityItem[] = await getActivity(200, entity);

  return (
    <div className="ad-page">
      <div className="ad-page-head">
        <div>
          <h1>Activity log</h1>
          <div className="ad-sub">Every change to units, projects, leads and visits, and every sign-in · latest 200</div>
        </div>
        <nav className="ad-seg" aria-label="Filter activity">
          {FILTERS.map(([k, l]) => (
            <Link key={k} href={k === "all" ? "/admin/activity" : `/admin/activity?type=${k}`} aria-current={(entity ?? "all") === k ? "true" : undefined}>
              {l}
            </Link>
          ))}
        </nav>
      </div>
      <section className="ad-section">
        <ActivityFeed items={items} />
      </section>
    </div>
  );
}
