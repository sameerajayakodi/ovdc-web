"use client";

import { useId, useState } from "react";

type Item = { title: string; body: React.ReactNode };

/** Single-open accordion (the first item starts open unless `initial` says otherwise). */
export function Accordion({ items, initial = 0 }: { items: Item[]; initial?: number }) {
  const [open, setOpen] = useState(initial);
  const id = useId();

  return (
    <div className="acc">
      {items.map((it, i) => (
        <div key={it.title} className="acc-item">
          <button
            type="button"
            className="acc-btn"
            id={`${id}-b${i}`}
            aria-expanded={open === i}
            aria-controls={`${id}-p${i}`}
            onClick={() => setOpen(open === i ? -1 : i)}
          >
            {it.title}
            <span aria-hidden>{open === i ? "−" : "+"}</span>
          </button>
          <div id={`${id}-p${i}`} role="region" aria-labelledby={`${id}-b${i}`} hidden={open !== i} className="acc-body">
            {it.body}
          </div>
        </div>
      ))}
    </div>
  );
}
