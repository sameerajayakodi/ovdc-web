"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, CircleAlert, ExternalLink, Plus, Trash2 } from "lucide-react";
import { saveList, type AwardInput, type FaqInput, type JobInput, type TestimonialInput } from "@/app/admin/content-actions";
import { useAdminUi } from "../AdminRoot";
import s from "./content.module.css";

type Row = Record<string, unknown>;

export interface Field {
  key: string;
  label: string;
  /** lines: a string[] edited one item per line */
  kind: "text" | "textarea" | "switch" | "date" | "lines";
  width?: number;
  grow?: boolean;
  full?: boolean;
  placeholder?: string;
  /** datalist id for suggestions */
  list?: string;
}

interface Props {
  kind: "faq" | "testimonials" | "awards" | "jobs";
  title: string;
  sub: string;
  rows: Row[];
  fields: Field[];
  blank: Row;
  heading: (r: Row) => string;
  groups?: string[];
  viewHref?: string;
  /** Rendered next to each row's heading (e.g. a link to the live page) */
  aside?: (r: Row) => React.ReactNode;
  compact?: boolean;
}

/** Edits a whole list (order, additions, removals) and saves it in one go. */
export function ListEditor({ kind, title, sub, rows: initial, fields, blank, heading, groups = [], viewHref, aside, compact }: Props) {
  const { toast, confirm } = useAdminUi();
  const [base, setBase] = useState(initial);
  const [rows, setRows] = useState(initial);
  const [err, setErr] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const dirty = useMemo(() => JSON.stringify(rows) !== JSON.stringify(base), [rows, base]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = (i: number, k: string, v: unknown) => setRows((r) => r.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const move = (i: number, to: number) =>
    setRows((r) => {
      const n = [...r];
      const [m] = n.splice(i, 1);
      n.splice(to, 0, m);
      return n;
    });

  async function remove(i: number) {
    if (!(await confirm({ danger: true, title: `Remove “${heading(rows[i])}”?`, body: "It disappears from the website when you save.", confirmLabel: "Remove" }))) return;
    setRows((r) => r.filter((_, j) => j !== i));
  }

  function save() {
    start(async () => {
      try {
        const r =
          kind === "faq"
            ? await saveList("faq", rows as unknown as FaqInput[])
            : kind === "testimonials"
              ? await saveList("testimonials", rows as unknown as TestimonialInput[])
              : kind === "awards"
                ? await saveList("awards", rows as unknown as AwardInput[])
                : await saveList("jobs", rows as unknown as JobInput[]);
        if (!r.ok) {
          setErr(r.fields ?? {});
          return toast(r.error, "err");
        }
        setErr({});
        setBase(rows);
        toast(r.message ?? "Saved");
      } catch {
        toast("Could not save. Check your connection and try again.", "err");
      }
    });
  }

  return (
    <div className={s.listWrap}>
      <div className="ad-page-head">
        <div>
          <h1>{title}</h1>
          <div className="ad-sub">
            {sub} · {rows.length} item{rows.length === 1 ? "" : "s"}
          </div>
        </div>
        {viewHref && (
          <a className="ad-btn ad-btn-secondary" href={viewHref} target="_blank" rel="noreferrer">
            <ExternalLink size={15} />
            View on site
          </a>
        )}
        <button type="button" className="ad-btn ad-btn-secondary" onClick={() => setRows((r) => [...r, { ...blank }])}>
          <Plus size={16} />
          Add
        </button>
      </div>
      {groups.length > 0 && (
        <datalist id="faq-groups">
          {groups.map((g) => (
            <option key={g} value={g} />
          ))}
        </datalist>
      )}

      <ol className={s.rows}>
        {rows.map((r, i) => (
          <li key={i} className={s.row} data-hidden={r.published === false || r.shown === false || r.open === false || undefined} aria-label={heading(r)}>
            <div className={s.rowHead}>
              <span className={s.rowNo}>{i + 1}</span>
              <strong className={s.rowTitle}>{heading(r)}</strong>
              {aside?.(r)}
              <button type="button" className="ad-btn ad-btn-icon" aria-label={`Move ${heading(r)} up`} disabled={i === 0} onClick={() => move(i, i - 1)}>
                <ArrowUp size={15} />
              </button>
              <button type="button" className="ad-btn ad-btn-icon" aria-label={`Move ${heading(r)} down`} disabled={i === rows.length - 1} onClick={() => move(i, i + 1)}>
                <ArrowDown size={15} />
              </button>
              <button type="button" className="ad-btn ad-btn-icon" aria-label={`Remove ${heading(r)}`} onClick={() => remove(i)}>
                <Trash2 size={15} />
              </button>
            </div>
            <div className={s.rowFields} data-compact={compact || undefined}>
              {fields.map((f) => {
                const id = `${kind}-${i}-${f.key}`;
                const style = f.full ? { gridColumn: "1 / -1" } : f.grow ? { flex: "1 1 260px" } : { flex: `0 1 ${f.width ?? 200}px` };
                if (f.kind === "switch")
                  return (
                    <label key={f.key} className="ad-switch" style={{ alignSelf: "flex-end", minHeight: 36 }}>
                      <input type="checkbox" checked={r[f.key] !== false} onChange={(e) => set(i, f.key, e.target.checked)} aria-label={`${f.label}: ${heading(r)}`} />
                      <span className="track" />
                      {f.label}
                    </label>
                  );
                return (
                  <div key={f.key} className="ad-field" style={style}>
                    <label htmlFor={id}>{f.label}</label>
                    {f.kind === "textarea" || f.kind === "lines" ? (
                      <textarea
                        id={id}
                        className="ad-input"
                        style={{ minHeight: f.kind === "lines" ? 84 : 72 }}
                        value={f.kind === "lines" ? ((r[f.key] as string[]) ?? []).join("\n") : String(r[f.key] ?? "")}
                        onChange={(e) => set(i, f.key, f.kind === "lines" ? e.target.value.split("\n") : e.target.value)}
                        placeholder={f.kind === "lines" ? "One per line" : f.placeholder}
                      />
                    ) : (
                      <input id={id} className="ad-input" type={f.kind === "date" ? "date" : "text"} list={f.list} value={String(r[f.key] ?? "")} onChange={(e) => set(i, f.key, e.target.value)} placeholder={f.placeholder} />
                    )}
                  </div>
                );
              })}
            </div>
            {err[`row${i}`] && (
              <span className="ad-error" style={{ padding: "0 14px 12px" }}>
                <CircleAlert size={13} />
                {err[`row${i}`]}
              </span>
            )}
          </li>
        ))}
        {!rows.length && <li className="ad-empty">Nothing here yet. Use “Add” to create the first one.</li>}
      </ol>

      <div className={s.bar} data-dirty={dirty || undefined}>
        <span className={s.state}>
          <span className={s.dot} />
          {dirty ? "Unsaved changes" : "All changes saved"}
        </span>
        <div style={{ flex: 1 }} />
        <button type="button" className="ad-btn ad-btn-secondary" onClick={() => (setRows(base), setErr({}))} disabled={!dirty || pending}>
          Discard
        </button>
        <button type="button" className="ad-btn ad-btn-primary" onClick={save} disabled={!dirty || pending}>
          {pending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
