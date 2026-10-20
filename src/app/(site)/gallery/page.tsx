import type { Metadata } from "next";
import { Suspense } from "react";
import { getProjects } from "@/lib/api";
import { photos, progressPhotos, projectGallery, type PhotoKey } from "@/lib/data/media";
import { PageHero } from "@/components/ui/PageHero";
import { GalleryGrid, type GalleryItem } from "@/components/content/GalleryGrid";

export const metadata: Metadata = {
  title: "Gallery",
  description: "Photographs of OVDC developments: exteriors, interiors, amenities, locations and construction.",
};

const KIND: Partial<Record<PhotoKey, GalleryItem["kind"]>> = {
  heroPool: "Amenities", poolDay: "Amenities", gym: "Amenities", gymWarm: "Amenities", library: "Amenities", lobby: "Amenities", koiPond: "Amenities", gardenPond: "Amenities", playground: "Amenities",
  livingSea: "Interior", diningSea: "Interior", bedroomSea: "Interior", living: "Interior", livingCity: "Interior", kitchen: "Interior", kitchenWhite: "Interior", kitchenCompact: "Interior", bedroom: "Interior", bathroom: "Interior", bathTub: "Interior", balconySea: "Interior", balconyOcean: "Interior",
  oceanSunset: "Location", oceanDusk: "Location", mountLavinia: "Location", colomboDay: "Location", colomboDusk: "Location", kandyHills: "Location",
};

export default async function GalleryPage() {
  const projects = await getProjects();
  const items: GalleryItem[] = [];
  for (const p of projects) {
    for (const k of projectGallery[p.slug] ?? []) items.push({ project: p.name, slug: p.slug, photo: photos[k], kind: KIND[k] ?? "Exterior" });
  }
  const ovr = projects.find((p) => p.slug === "ocean-view-residences")!;
  for (const k of ["bathTub", "balconyOcean", "kitchenWhite", "mountLavinia"] as PhotoKey[]) items.push({ project: ovr.name, slug: ovr.slug, photo: photos[k], kind: KIND[k] ?? "Exterior" });
  for (const k of progressPhotos) items.push({ project: ovr.name, slug: ovr.slug, photo: photos[k], kind: "Construction" });

  return (
    <>
      <PageHero crumb="Gallery" title="Gallery" lead="Exteriors, show apartments, amenities and our sites under construction. Tap any photo to view it full screen." />
      <Suspense fallback={<div className="wrap skeleton" style={{ height: 600, marginTop: 24 }} />}>
        <GalleryGrid items={items} projects={projects.map(({ slug, name }) => ({ slug, name }))} />
      </Suspense>
    </>
  );
}
