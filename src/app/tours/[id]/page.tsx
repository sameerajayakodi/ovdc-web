import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getTour, getTours } from "@/lib/api";
import { TourScreen } from "@/components/tour/TourScreen";

export async function generateStaticParams() {
  const tours = await getTours();
  return tours.map((t) => ({ id: t.id }));
}

export async function generateMetadata({ params }: PageProps<"/tours/[id]">): Promise<Metadata> {
  const tour = await getTour((await params).id);
  if (!tour) return {};
  return {
    title: `${tour.title} · 360° virtual tour`,
    description: `Walk through ${tour.projectName} ${tour.unitRef} room by room: ${tour.scenes.map((s) => s.name.toLowerCase()).join(", ")}.`,
  };
}

const Shell = () => <div style={{ height: "100svh", background: "#060d18" }} />;

export default function TourPage({ params }: PageProps<"/tours/[id]">) {
  return (
    <main>
      <Suspense fallback={<Shell />}>
        <Tour params={params} />
      </Suspense>
    </main>
  );
}

async function Tour({ params }: { params: PageProps<"/tours/[id]">["params"] }) {
  const tour = await getTour((await params).id);
  if (!tour) notFound();
  return (
    <>
      <h1 className="sr-only">
        {tour.title}, {tour.projectName} — 360° virtual tour
      </h1>
      <Suspense fallback={<Shell />}>
        <TourScreen tour={tour} />
      </Suspense>
    </>
  );
}
