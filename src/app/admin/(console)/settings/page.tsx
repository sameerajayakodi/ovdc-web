import type { Metadata } from "next";
import { Suspense } from "react";
import { desc, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/admin/auth";
import { hasDb } from "@/lib/admin/queries";
import { loadSiteSettings } from "@/lib/api";
import { SettingsConsole } from "@/components/admin/settings/SettingsConsole";
import { DbMissing, PageSkeleton } from "@/components/admin/States";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage({ searchParams }: PageProps<"/admin/settings">) {
  return (
    <Suspense fallback={<PageSkeleton rows={8} />}>
      <Settings searchParams={searchParams} />
    </Suspense>
  );
}

const TABS = ["company", "contacts", "offices", "currency"] as const;

async function Settings({ searchParams }: Pick<PageProps<"/admin/settings">, "searchParams">) {
  await requireAdmin();
  if (!hasDb() || !db) return <DbMissing />;
  const { tab } = await searchParams;
  const [settings, [last]] = await Promise.all([
    loadSiteSettings(),
    db.select({ at: schema.settings.updatedAt }).from(schema.settings).where(inArray(schema.settings.key, ["company", "offices", "fx"])).orderBy(desc(schema.settings.updatedAt)).limit(1),
  ]);
  return <SettingsConsole settings={settings} savedAt={last?.at.toISOString() ?? null} initialTab={TABS.find((t) => t === tab) ?? "company"} />;
}
