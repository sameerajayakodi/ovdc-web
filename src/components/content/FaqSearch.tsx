"use client";

import { useState } from "react";
import { Accordion } from "@/components/ui/Accordion";
import { IconSearch } from "@/components/ui/Icons";

type Group = { group: string; items: { q: string; a: string }[] };

export function FaqSearch({ groups }: { groups: Group[] }) {
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const filtered = groups
    .map((g) => ({ ...g, items: g.items.filter((i) => !needle || `${i.q} ${i.a}`.toLowerCase().includes(needle)) }))
    .filter((g) => g.items.length);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 48 }}>
      <label style={{ display: "flex", alignItems: "center", gap: 12, maxWidth: 640, borderBottom: "2px solid var(--color-rule-strong)" }}>
        <IconSearch size={20} />
        <span className="sr-only">Search questions</span>
        <input
          type="search"
          className="input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search: loan, deed, foreigners, maintenance…"
          style={{ border: 0, boxShadow: "none", fontSize: 18 }}
        />
      </label>
      {filtered.length === 0 && (
        <p className="lead" role="status">
          No questions match “{q}”. Try another word, or ask us directly.
        </p>
      )}
      {filtered.map((g) => (
        <section key={g.group} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(260px, 100%), 1fr))", gap: "16px 48px" }}>
          <h2 style={{ fontSize: 32, lineHeight: 1 }}>{g.group}</h2>
          <div style={{ gridColumn: "span 2", minWidth: 0 }}>
            <Accordion key={needle} items={g.items.map((i) => ({ title: i.q, body: <p>{i.a}</p> }))} initial={needle ? 0 : -1} />
          </div>
        </section>
      ))}
    </div>
  );
}
