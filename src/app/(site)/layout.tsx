import { Suspense } from "react";
import { Nav, NavFallback } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { Dock } from "@/components/layout/Dock";
import { getProjects } from "@/lib/api";

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const projects = await getProjects();
  const navProjects = projects.map(({ id, slug, name, loc, status, from }) => ({ id, slug, name, loc, status, from }));

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      {/* Nav and Dock read the pathname; Suspense lets pages regenerated after an
          admin edit render even when their URL is only known at request time. */}
      <Suspense fallback={<NavFallback />}>
        <Nav projects={navProjects} />
      </Suspense>
      <main id="main">{children}</main>
      <Footer />
      <Suspense fallback={null}>
        <Dock />
      </Suspense>
    </>
  );
}
