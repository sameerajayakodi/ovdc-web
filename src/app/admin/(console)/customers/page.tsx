import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/admin/auth";
import { hasDb } from "@/lib/admin/queries";
import { getCustomer, getCustomerList } from "@/lib/admin/salesQueries";
import { ymdOf } from "@/lib/admin/crm";
import { nowMs } from "@/lib/admin/format";
import { cloudinaryConfig } from "@/lib/cloudinary";
import { CustomersConsole } from "@/components/admin/customers/CustomersConsole";
import { DbMissing, PageSkeleton } from "@/components/admin/States";

export const metadata: Metadata = { title: "Customers" };

export default function CustomersPage({ searchParams }: PageProps<"/admin/customers">) {
  return (
    <Suspense fallback={<PageSkeleton rows={10} />}>
      <Customers searchParams={searchParams} />
    </Suspense>
  );
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function Customers({ searchParams }: Pick<PageProps<"/admin/customers">, "searchParams">) {
  await requireAdmin();
  if (!hasDb()) return <DbMissing />;
  const sp = await searchParams;
  const now = nowMs();
  const today = ymdOf(now);
  const list = await getCustomerList(today);
  const want = Number(one(sp.c));
  const id = list.find((c) => c.id === want)?.id ?? list[0]?.id;
  const current = id ? await getCustomer(id) : null;
  return <CustomersConsole list={list} current={current} today={today} uploads={!!cloudinaryConfig()} q={one(sp.q) ?? ""} />;
}
