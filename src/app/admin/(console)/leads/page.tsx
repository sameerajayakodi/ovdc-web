import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/admin/auth";
import { getAdminProjects, hasDb } from "@/lib/admin/queries";
import { getAgents, getLeadDetail, getLeads } from "@/lib/admin/crmQueries";
import { isStage } from "@/lib/admin/crm";
import { nowMs } from "@/lib/admin/format";
import { LeadsConsole } from "@/components/admin/leads/LeadsConsole";
import { DbMissing, PageSkeleton } from "@/components/admin/States";

export const metadata: Metadata = { title: "Leads" };

export default function LeadsPage({ searchParams }: PageProps<"/admin/leads">) {
  return (
    <Suspense fallback={<PageSkeleton rows={10} />}>
      <Leads searchParams={searchParams} />
    </Suspense>
  );
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function Leads({ searchParams }: Pick<PageProps<"/admin/leads">, "searchParams">) {
  const admin = await requireAdmin();
  if (!hasDb()) return <DbMissing />;
  const sp = await searchParams;
  const open = Number(one(sp.lead));
  const stage = one(sp.stage);

  const [leads, agents, projects, detail] = await Promise.all([
    getLeads(),
    getAgents(),
    getAdminProjects(),
    Number.isInteger(open) && open > 0 ? getLeadDetail(open) : Promise.resolve(null),
  ]);

  return (
    <LeadsConsole
      leads={leads}
      agents={[...new Set([admin.name, ...agents])]}
      projects={projects.map((p) => p.name)}
      initialStage={isStage(stage) ? stage : undefined}
      initialDetail={detail}
      initialQuery={one(sp.q) ?? ""}
      now={nowMs()}
    />
  );
}
