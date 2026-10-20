import type { Metadata } from "next";
import { getProjects, getTowers, getUnitTypes } from "@/lib/api";
import { PageHero } from "@/components/ui/PageHero";
import { Shortlist } from "@/components/content/Shortlist";

export const metadata: Metadata = {
  title: "Your shortlist",
  robots: { index: false },
};

export default async function ShortlistPage() {
  const projects = await getProjects();
  const withInventory = projects.filter((p) => p.explorer);
  const units = (
    await Promise.all(
      withInventory.map(async (p) => {
        const [towers, types] = await Promise.all([getTowers(p.slug), getUnitTypes(p.slug)]);
        return Object.values(towers ?? {}).flatMap((fl) =>
          fl.flatMap((f) => f.units.map((u) => ({ ...u, projectSlug: p.slug, projectName: p.name, completion: p.completion, tourId: types.find((t) => t.type === u.type)?.tourId }))),
        );
      }),
    )
  ).flat();

  return (
    <>
      <PageHero crumb="Shortlist" title="Your shortlist" lead="Homes and projects you’ve saved on this device. Compare up to three units side by side." />
      <Shortlist projects={projects} units={units} />
    </>
  );
}
