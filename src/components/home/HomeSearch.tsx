"use client";

import { useRouter } from "next/navigation";
import { LOCATIONS } from "@/lib/data/projects";
import { IconSearch } from "@/components/ui/Icons";
import styles from "./home.module.css";

const FIELDS = [
  { id: "loc", label: "Location", options: LOCATIONS.map((l) => [l, l]) },
  { id: "type", label: "Property type", options: [["Apartments", "Apartment"], ["Townhouses", "Townhouse"], ["Villas", "Villa"], ["Land", "Land"]] },
  { id: "beds", label: "Bedrooms", options: [["2", "2 Bed"], ["3", "3 Bed"], ["4", "4 Bed +"]] },
  { id: "max", label: "Budget (LKR)", options: [["60", "Under 60 Mn"], ["100", "Up to 100 Mn"], ["150", "Up to 150 Mn"], ["0", "150 Mn +"]] },
  { id: "status", label: "Status", options: [["uc", "Under construction"], ["done", "Completed"], ["soon", "Upcoming"]] },
];

export function HomeSearch() {
  const router = useRouter();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = new URLSearchParams();
    new FormData(e.currentTarget).forEach((v, k) => {
      if (v) q.set(k, String(v));
    });
    router.push(`/projects${q.size ? `?${q}` : ""}`);
  }

  return (
    <form onSubmit={onSubmit} aria-label="Find a home" className={styles.search}>
      {FIELDS.map((f) => (
        <div key={f.id} className={`field ${styles.searchField}`}>
          <label htmlFor={`hs-${f.id}`}>{f.label}</label>
          <select id={`hs-${f.id}`} name={f.id} className="input" defaultValue="" style={{ border: 0, fontWeight: 500 }}>
            <option value="">Any</option>
            {f.options.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
      ))}
      <div className={styles.searchGo}>
        <button className="btn btn-primary btn-block btn-lg" type="submit">
          Search
          <IconSearch />
        </button>
      </div>
    </form>
  );
}
