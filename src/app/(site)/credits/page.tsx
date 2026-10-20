import type { Metadata } from "next";
import { photos } from "@/lib/data/media";
import { PageHero } from "@/components/ui/PageHero";
import c from "@/components/content/content.module.css";

export const metadata: Metadata = {
  title: "Photo credits",
  robots: { index: false },
};

const PANOS = [
  ["Living Room", "Wooden Lounge", "wooden_lounge"],
  ["Kitchen & Dining", "Kiara Interior", "kiara_interior"],
  ["Master Bedroom", "Relax Inn Seaview Suite", "relax_inn_seaview_suite"],
  ["Bathroom", "Modern Bathroom", "modern_bathroom"],
  ["Terrace", "Veranda", "veranda"],
];

export default function CreditsPage() {
  const list = Object.values(photos);
  return (
    <>
      <PageHero crumb="Credits" title="Photo credits" lead="Some photographs and panoramas on this site are licensed stock images used until OVDC’s own photography is complete." />
      <section className={c.section}>
        <div className={c.split}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <h2 className="h-sub">Photography · Unsplash</h2>
            <p className="muted" style={{ fontSize: 14 }}>
              Used under the Unsplash License.
            </p>
            <ul className={c.list}>
              {list.map((p) => (
                <li key={p.src} style={{ fontSize: 14 }}>
                  <span>{p.alt}</span>
                  <a href={`https://unsplash.com/@${p.user}?utm_source=ovdc&utm_medium=referral`} target="_blank" rel="noopener" style={{ whiteSpace: "nowrap" }}>
                    {p.by}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <h2 className="h-sub">360° panoramas · Poly Haven</h2>
            <p className="muted" style={{ fontSize: 14 }}>
              CC0 (public domain), from polyhaven.com.
            </p>
            <ul className={c.list}>
              {PANOS.map(([scene, title, id]) => (
                <li key={id} style={{ fontSize: 14 }}>
                  <span>{scene}</span>
                  <a href={`https://polyhaven.com/a/${id}`} target="_blank" rel="noopener">
                    {title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
