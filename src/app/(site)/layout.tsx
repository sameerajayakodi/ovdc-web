import { Nav } from "@/components/layout/Nav";
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
      <Nav projects={navProjects} />
      <main id="main">{children}</main>
      <Footer />
      <Dock />
    </>
  );
}
