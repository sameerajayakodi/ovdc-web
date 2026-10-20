import type { Metadata } from "next";
import { Suspense } from "react";
import { getProjects } from "@/lib/api";
import { BookVisit } from "@/components/visit/BookVisit";
import { PageHero } from "@/components/ui/PageHero";

export const metadata: Metadata = {
  title: "Book a site visit",
  description: "Choose a project, a date and a time to visit an OVDC show apartment or sales gallery, or book a live video walk-through from abroad.",
};

export default async function BookVisitPage() {
  const projects = (await getProjects()).filter((p) => p.status !== "done" || p.available > 0);
  return (
    <>
      <PageHero
        crumb="Book a visit"
        kicker="Site visits run daily"
        title={
          <>
            See it <em>in person.</em>
          </>
        }
        lead="Walk the show apartment, see the site and talk through payment plans with a sales advisor. Abroad? Book a live video tour instead."
      />
      <Suspense fallback={<div className="wrap skeleton" style={{ height: 480, margin: "40px 0" }} />}>
        <BookVisit projects={projects.map(({ slug, name, loc, status }) => ({ slug, name, loc, status }))} />
      </Suspense>
    </>
  );
}
