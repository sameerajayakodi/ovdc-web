import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/admin/auth";
import { getAdminProjects, hasDb } from "@/lib/admin/queries";
import { getAgents, getCapacity, getLeadDetail, getLeadOptions, getVisit, getVisits } from "@/lib/admin/crmQueries";
import { addDays, at, isYmd, rangeOf, ymdOf } from "@/lib/admin/crm";
import { nowMs } from "@/lib/admin/format";
import { VisitsConsole } from "@/components/admin/visits/VisitsConsole";
import type { CalendarView } from "@/lib/admin/crm";
import { DbMissing, PageSkeleton } from "@/components/admin/States";

export const metadata: Metadata = { title: "Site visits" };

export default function VisitsPage({ searchParams }: PageProps<"/admin/visits">) {
  return (
    <Suspense fallback={<PageSkeleton rows={10} />}>
      <Visits searchParams={searchParams} />
    </Suspense>
  );
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const VIEWS: CalendarView[] = ["day", "week", "month", "list"];

async function Visits({ searchParams }: Pick<PageProps<"/admin/visits">, "searchParams">) {
  const admin = await requireAdmin();
  if (!hasDb()) return <DbMissing />;
  const sp = await searchParams;
  const now = nowMs();
  const today = ymdOf(now);

  const visitId = Number(one(sp.visit));
  const focus = Number.isInteger(visitId) && visitId > 0 ? await getVisit(visitId) : null;
  const dParam = one(sp.d);
  const d = isYmd(dParam) ? dParam : focus ? ymdOf(Date.parse(focus.startsAt)) : today;
  const view = VIEWS.find((v) => v === one(sp.view)) ?? "week";
  const { start, days } = rangeOf(view, d);

  const bookId = Number(one(sp.book));
  const book = Number.isInteger(bookId) && bookId > 0 ? bookId : null;
  const [visits, capacity, agents, options, projects, bookDetail] = await Promise.all([
    getVisits(at(start), at(addDays(start, days))),
    getCapacity(),
    getAgents(),
    getLeadOptions(),
    getAdminProjects(),
    book ? getLeadDetail(book) : Promise.resolve(null),
  ]);
  // A won or lost lead is not in the picker list, but can still be booked from its page.
  const leadOptions =
    bookDetail && !options.some((o) => o.id === bookDetail.lead.id)
      ? [{ id: bookDetail.lead.id, name: bookDetail.lead.name, mobile: bookDetail.lead.mobile, project: bookDetail.lead.project, stage: bookDetail.lead.stage }, ...options]
      : options;

  return (
    <VisitsConsole
      view={view}
      d={d}
      today={today}
      start={start}
      days={days}
      visits={visits}
      capacity={capacity}
      agents={[...new Set([admin.name, ...agents])]}
      projects={projects.map((p) => p.name)}
      leadOptions={leadOptions}
      initialVisit={focus?.id ?? null}
      bookLead={bookDetail ? book : null}
      initialLocation={one(sp.loc) ?? "all"}
      now={now}
    />
  );
}
