import { Suspense } from "react";
import { Nav, NavFallback } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { Dock } from "@/components/layout/Dock";
import { getProjects, getSiteSettings } from "@/lib/api";
import { SiteSettingsProvider } from "@/components/providers/SiteSettings";

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const [projects, { company, fx }] = await Promise.all([getProjects(), getSiteSettings()]);
  const navProjects = projects.map(({ id, slug, name, loc, status, from }) => ({ id, slug, name, loc, status, from }));

  return (
    <SiteSettingsProvider value={{ company, fx }}>
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
    </SiteSettingsProvider>
  );
}
