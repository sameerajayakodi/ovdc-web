import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Suspense } from "react";
import { getProjects } from "@/lib/api";
import { ProjectsBrowser } from "@/components/projects/ProjectsBrowser";

export const metadata: Metadata = {
  title: "Projects · Apartments, townhouses & villas in Sri Lanka",
  description:
    "Every OVDC development: luxury apartments in Colombo and Mount Lavinia, townhouses in Negombo and villas in Kandy. Filter by location, budget and bedrooms.",
};

export default async function ProjectsPage() {
  const projects = await getProjects();

  return (
    <>
      <header
        className="wrap"
        style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: "16px 48px", paddingTop: "clamp(40px, 5vw, 72px)", paddingBottom: 28 }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Breadcrumbs items={[{ label: "Projects" }]} />
          <h1 className="h-page">Projects</h1>
        </div>
        <p className="muted" style={{ maxWidth: "52ch", fontSize: 15, lineHeight: 1.6 }}>
          Apartments, townhouses, villas and land from Negombo to Mount Lavinia and Kandy. Every project is UDA approved.
        </p>
      </header>
      <Suspense fallback={<div className="wrap skeleton" style={{ height: 480 }} />}>
        <ProjectsBrowser projects={projects} />
      </Suspense>
    </>
  );
}
