import Link from "next/link";
import { photos } from "@/lib/data/media";
import { routes } from "@/lib/routes";
import { ImageSlot } from "@/components/ui/ImageSlot";

export default function NotFound() {
  return (
    <main
      data-theme="dark"
      style={{ position: "relative", minHeight: "100svh", display: "flex", alignItems: "flex-end", overflow: "hidden", background: "var(--color-navy)", color: "var(--color-on-navy)" }}
    >
      <title>Page not found | OVDC</title>
      <meta name="robots" content="noindex" />
      <ImageSlot photo={photos.oceanDusk} tone="dark" sizes="100vw" />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(15,27,45,.5), rgba(15,27,45,.92))" }} />
      <div className="wrap" style={{ position: "relative", display: "flex", flexDirection: "column", gap: 20, paddingBottom: "clamp(48px, 8vw, 120px)", maxWidth: 960 }}>
        <Link href="/" style={{ fontFamily: "var(--font-heading)", fontSize: 30, letterSpacing: ".16em", textDecoration: "none" }}>
          OVDC
        </Link>
        <span className="kicker kicker-on-navy">404 · Page not found</span>
        <h1 style={{ fontSize: "clamp(48px, 7vw, 104px)", lineHeight: 0.92, color: "var(--color-white)" }}>
          This view is <em>still being built.</em>
        </h1>
        <p style={{ maxWidth: "48ch", fontSize: 17, lineHeight: 1.6, color: "var(--color-on-navy-muted)" }}>
          The page you were looking for has moved or doesn’t exist. Try one of these instead.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link className="btn btn-primary btn-lg" href={routes.projects}>
            View projects<span aria-hidden>→</span>
          </Link>
          <Link className="btn btn-secondary on-dark btn-lg" href="/">
            Home
          </Link>
          <Link className="btn btn-secondary on-dark btn-lg" href={routes.contact}>
            Contact
          </Link>
        </div>
      </div>
    </main>
  );
}
