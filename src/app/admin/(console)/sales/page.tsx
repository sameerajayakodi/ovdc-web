import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/admin/auth";
import { hasDb } from "@/lib/admin/queries";
import { getAgents, getLeadOptions } from "@/lib/admin/crmQueries";
import { getAvailableUnits, getCustomerOptions, getReservations } from "@/lib/admin/salesQueries";
import { nowMs } from "@/lib/admin/format";
import { SalesConsole } from "@/components/admin/sales/SalesConsole";
import { DbMissing, PageSkeleton } from "@/components/admin/States";

export const metadata: Metadata = { title: "Reservations & sales" };

export default function SalesPage({ searchParams }: PageProps<"/admin/sales">) {
  return (
    <Suspense fallback={<PageSkeleton rows={10} />}>
      <Sales searchParams={searchParams} />
    </Suspense>
  );
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function Sales({ searchParams }: Pick<PageProps<"/admin/sales">, "searchParams">) {
  await requireAdmin();
  if (!hasDb()) return <DbMissing />;
  const sp = await searchParams;
  const [list, units, leads, customers, agents] = await Promise.all([getReservations(), getAvailableUnits(), getLeadOptions(), getCustomerOptions(), getAgents()]);
  const r = Number(one(sp.r));
  const lead = Number(one(sp.lead));
  return (
    <SalesConsole
      list={list}
      units={units}
      leads={leads.filter((l) => l.name.trim())}
      customers={customers}
      agents={agents}
      initial={Number.isInteger(r) && r > 0 ? r : null}
      newFor={Number.isInteger(lead) && lead > 0 ? lead : null}
      now={nowMs()}
    />
  );
}
