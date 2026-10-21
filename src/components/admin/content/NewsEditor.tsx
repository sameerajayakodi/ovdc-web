"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, CircleAlert, ExternalLink, Heading2, Pilcrow, Plus, Search, Trash2 } from "lucide-react";
import { deletePost, savePost, type PostInput } from "@/app/admin/content-actions";
import type { PostBlock } from "@/db/schema";
import { POST_CATEGORIES } from "@/lib/admin/content";
import { dateTime } from "@/lib/admin/format";
import { useAdminUi } from "../AdminRoot";
import type { AdminPost } from "./ContentConsole";
import s from "./content.module.css";

type Image = { id: number; name: string; url: string };
type Stock = { key: string; alt: string; src: string };

/** Sri Lanka has no daylight saving, so a fixed +05:30 offset is exact. */
const OFFSET = 5.5 * 3_600_000;
const toLocal = (iso: string) => new Date(Date.parse(iso) + OFFSET).toISOString().slice(0, 16);
const fromLocal = (v: string) => new Date(`${v}:00+05:30`).toISOString();

interface Draft {
  title: string;
  slug: string;
  dek: string;
  category: PostInput["category"];
  author: string;
  publishAt: string;
  photo: string;
  coverMediaId: number | null;
  body: PostBlock[];
}

function draftOf(p: AdminPost | null, now: number, stock: Stock[]): Draft {
  if (!p) return { title: "", slug: "", dek: "", category: "Company", author: "OVDC", publishAt: toLocal(new Date(now).toISOString()), photo: stock[0]?.key ?? "", coverMediaId: null, body: [{ p: "" }] };
  return { title: p.title, slug: p.slug, dek: p.dek, category: p.category, author: p.author, publishAt: toLocal(p.publishAt), photo: p.photo, coverMediaId: p.coverMediaId, body: p.body.length ? p.body : [{ p: "" }] };
}

function status(p: { published: boolean; publishAt: string }, now: number) {
  if (!p.published) return { label: "Draft", tag: "ad-tag-neutral" };
  return Date.parse(p.publishAt) > now ? { label: "Scheduled", tag: "ad-tag-outline" } : { label: "Live", tag: "ad-tag-ok" };
}

export function NewsEditor({ posts, images, stock, now }: { posts: AdminPost[]; images: Image[]; stock: Stock[]; now: number }) {
  const { toast, confirm } = useAdminUi();
  const [sel, setSel] = useState<number | "new" | null>(posts[0]?.id ?? "new");
  const [q, setQ] = useState("");
  const post = typeof sel === "number" ? (posts.find((p) => p.id === sel) ?? null) : null;
  const [base, setBase] = useState(() => draftOf(post, now, stock));
  const [d, setD] = useState(base);
  const [err, setErr] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const dirty = useMemo(() => JSON.stringify(d) !== JSON.stringify(base), [d, base]);
  const words = d.body.reduce((n, b) => n + `${b.h ?? ""} ${b.p}`.split(/\s+/).filter(Boolean).length, 0);
  const shown = posts.filter((p) => !q || `${p.title} ${p.category} ${p.author}`.toLowerCase().includes(q.toLowerCase()));
  const st = post ? status(post, now) : null;
  const future = Date.parse(fromLocal(d.publishAt)) > now;
  const cover = d.coverMediaId != null ? images.find((m) => m.id === d.coverMediaId)?.url : stock.find((x) => x.key === d.photo)?.src;

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function open(next: number | "new") {
    if (next === sel) return;
    if (dirty && !(await confirm({ title: "Discard unsaved changes?", body: "Your edits to this post have not been saved.", confirmLabel: "Discard", danger: true }))) return;
    const p = typeof next === "number" ? (posts.find((x) => x.id === next) ?? null) : null;
    const nd = draftOf(p, now, stock);
    setSel(next);
    setBase(nd);
    setD(nd);
    setErr({});
  }

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => {
    setD((x) => ({ ...x, [k]: v }));
    // An edited field drops its error; the cover error belongs to the photo fields.
    const key = k === "coverMediaId" || k === "photo" ? "cover" : k;
    if (err[key])
      setErr((e) => {
        const n = { ...e };
        delete n[key];
        return n;
      });
  };
  const setBlock = (i: number, b: PostBlock) => set("body", d.body.map((x, j) => (j === i ? b : x)));
  const moveBlock = (i: number, to: number) => {
    const n = [...d.body];
    const [m] = n.splice(i, 1);
    n.splice(to, 0, m);
    set("body", n);
  };

  function save(published: boolean, publishNow = false) {
    const publishAt = publishNow && future ? new Date(now).toISOString() : fromLocal(d.publishAt);
    start(async () => {
      try {
        const r = await savePost(post?.id ?? null, { ...d, published, publishAt });
        if (!r.ok) {
          setErr(r.fields ?? {});
          return toast(r.error, "err");
        }
        const saved = { ...d, publishAt: toLocal(publishAt), slug: d.slug || "" };
        setErr({});
        setBase(saved);
        setD(saved);
        if (r.data) setSel(r.data.id);
        toast(r.message ?? "Saved");
      } catch {
        toast("Could not save. Check your connection and try again.", "err");
      }
    });
  }

  async function remove() {
    if (!post) return;
    if (!(await confirm({ danger: true, title: `Delete “${post.title}”?`, body: "The post is removed from the website and cannot be restored.", confirmLabel: "Delete post" }))) return;
    start(async () => {
      const r = await deletePost(post.id);
      toast(r.ok ? (r.message ?? "Deleted") : r.error, r.ok ? "ok" : "err");
      if (r.ok) {
        const nd = draftOf(null, now, stock);
        setSel("new");
        setBase(nd);
        setD(nd);
      }
    });
  }

  return (
    <div className={s.news}>
      <aside className={s.posts} aria-label="Posts">
        <div className={s.postsHead}>
          <div className="ad-search" style={{ flex: 1 }}>
            <Search size={15} />
            <input className="ad-input" placeholder="Search posts" aria-label="Search posts" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <button type="button" className="ad-btn ad-btn-primary ad-btn-sm" onClick={() => open("new")}>
            <Plus size={14} />
            New post
          </button>
        </div>
        <ul>
          {sel === "new" && (
            <li>
              <button type="button" aria-current="true" className={s.postItem}>
                <strong>{d.title || "Untitled post"}</strong>
                <span className="ad-tag ad-tag-neutral">New</span>
              </button>
            </li>
          )}
          {shown.map((p) => {
            const x = status(p, now);
            return (
              <li key={p.id}>
                <button type="button" className={s.postItem} aria-current={sel === p.id || undefined} onClick={() => open(p.id)}>
                  <strong>{p.title}</strong>
                  <span className={s.postMeta}>
                    <span className={`ad-tag ${x.tag}`}>{x.label}</span>
                    {p.category} · {dateTime(p.publishAt)}
                  </span>
                </button>
              </li>
            );
          })}
          {!shown.length && sel !== "new" && <li className="ad-muted" style={{ padding: 16 }}>No posts match.</li>}
        </ul>
      </aside>

      <div className={s.editor}>
        <div className="ad-page-head">
          <div>
            <h1>{post ? "Edit post" : "New post"}</h1>
            <div className="ad-sub">
              {st ? <span className={`ad-tag ${st.tag}`}>{st.label}</span> : "Not saved yet"} · {words} word{words === 1 ? "" : "s"} · about {Math.max(1, Math.round(words / 220))} min read
            </div>
          </div>
          {post?.published && (
            <a className="ad-btn ad-btn-secondary" href={`/news/${post.slug}`} target="_blank" rel="noreferrer">
              <ExternalLink size={15} />
              View on site
            </a>
          )}
          {post && (
            <button type="button" className="ad-btn ad-btn-icon" aria-label="Delete post" onClick={remove} disabled={pending}>
              <Trash2 size={16} />
            </button>
          )}
        </div>

        <section className="ad-section">
          <div className={s.fields}>
            <div className="ad-field" style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="post-title">Title</label>
              <input id="post-title" className="ad-input" value={d.title} onChange={(e) => set("title", e.target.value)} aria-invalid={!!err.title || undefined} />
              {err.title && <Err>{err.title}</Err>}
            </div>
            <div className="ad-field">
              <label htmlFor="post-slug">Web address</label>
              <input id="post-slug" className="ad-input" value={d.slug} placeholder="Made from the title" onChange={(e) => set("slug", e.target.value)} aria-invalid={!!err.slug || undefined} />
              <span className="ad-help">ovdc.lk/news/{d.slug || "…"}</span>
              {err.slug && <Err>{err.slug}</Err>}
            </div>
            <div className="ad-field">
              <label htmlFor="post-cat">Category</label>
              <select id="post-cat" className="ad-input" value={d.category} onChange={(e) => set("category", e.target.value as Draft["category"])}>
                {POST_CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="ad-field">
              <label htmlFor="post-author">Author</label>
              <input id="post-author" className="ad-input" value={d.author} onChange={(e) => set("author", e.target.value)} />
            </div>
            <div className="ad-field">
              <label htmlFor="post-at">Publish time (Colombo)</label>
              <input id="post-at" type="datetime-local" className="ad-input" value={d.publishAt} onChange={(e) => e.target.value && set("publishAt", e.target.value)} aria-invalid={!!err.publishAt || undefined} />
              {err.publishAt && <Err>{err.publishAt}</Err>}
            </div>
            <div className="ad-field" style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="post-dek">Standfirst</label>
              <textarea id="post-dek" className="ad-input" style={{ minHeight: 60 }} value={d.dek} onChange={(e) => set("dek", e.target.value)} placeholder="One or two sentences shown under the title and on the News page" />
            </div>
          </div>
        </section>

        <section className="ad-section" aria-label="Cover photo">
          <div className="ad-section-head">
            <h5>Cover photo</h5>
            {err.cover && <Err>{err.cover}</Err>}
          </div>
          <div className={s.coverRow}>
            <div className={s.coverPreview}>
              {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary or local stock photo */}
              {cover ? <img src={cover} alt="" /> : <span className="ad-muted">No cover</span>}
            </div>
            <div className={s.coverPick}>
              {images.length > 0 && <div className="ad-kicker">Media library</div>}
              <div className={s.thumbs}>
                {images.map((m) => (
                  <button key={m.id} type="button" className={s.thumb} aria-pressed={d.coverMediaId === m.id} aria-label={`Cover: ${m.name}`} onClick={() => set("coverMediaId", m.id)}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary thumbnail */}
                    <img src={m.url.replace("/upload/", "/upload/c_fill,g_auto,w_160,h_110,f_auto,q_auto/")} alt="" loading="lazy" />
                  </button>
                ))}
              </div>
              <div className="ad-kicker">Stock photos</div>
              <div className={s.thumbs}>
                {stock.map((x) => (
                  <button key={x.key} type="button" className={s.thumb} aria-pressed={d.coverMediaId == null && d.photo === x.key} aria-label={`Cover: ${x.alt}`} onClick={() => (set("coverMediaId", null), set("photo", x.key))}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- small local preview */}
                    <img src={x.src} alt="" loading="lazy" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="ad-section" aria-label="Body">
          <div className="ad-section-head">
            <h5>Body</h5>
            {err.body && <Err>{err.body}</Err>}
          </div>
          <ol className={s.blocks}>
            {d.body.map((b, i) => (
              <li key={i} className={s.block}>
                <div className={s.blockTools}>
                  <span className={s.rowNo}>{i + 1}</span>
                  <button type="button" className="ad-btn ad-btn-ghost ad-btn-sm" aria-pressed={b.h != null} onClick={() => setBlock(i, b.h != null ? { p: b.p } : { h: "", p: b.p })}>
                    <Heading2 size={14} />
                    {b.h != null ? "Remove heading" : "Add heading"}
                  </button>
                  <div style={{ flex: 1 }} />
                  <button type="button" className="ad-btn ad-btn-icon" aria-label={`Move section ${i + 1} up`} disabled={i === 0} onClick={() => moveBlock(i, i - 1)}>
                    <ArrowUp size={14} />
                  </button>
                  <button type="button" className="ad-btn ad-btn-icon" aria-label={`Move section ${i + 1} down`} disabled={i === d.body.length - 1} onClick={() => moveBlock(i, i + 1)}>
                    <ArrowDown size={14} />
                  </button>
                  <button type="button" className="ad-btn ad-btn-icon" aria-label={`Remove section ${i + 1}`} disabled={d.body.length === 1} onClick={() => set("body", d.body.filter((_, j) => j !== i))}>
                    <Trash2 size={14} />
                  </button>
                </div>
                {b.h != null && <input className={`ad-input ${s.blockH}`} aria-label={`Heading ${i + 1}`} placeholder="Section heading" value={b.h} onChange={(e) => setBlock(i, { ...b, h: e.target.value })} />}
                <textarea className="ad-input" aria-label={`Paragraph ${i + 1}`} placeholder="Write a paragraph…" style={{ minHeight: 110 }} value={b.p} onChange={(e) => setBlock(i, { ...b, p: e.target.value })} />
              </li>
            ))}
          </ol>
          <div style={{ padding: "0 16px 16px", display: "flex", gap: 8 }}>
            <button type="button" className="ad-btn ad-btn-secondary ad-btn-sm" onClick={() => set("body", [...d.body, { p: "" }])}>
              <Pilcrow size={14} />
              Add paragraph
            </button>
            <button type="button" className="ad-btn ad-btn-secondary ad-btn-sm" onClick={() => set("body", [...d.body, { h: "", p: "" }])}>
              <Heading2 size={14} />
              Add section with heading
            </button>
          </div>
        </section>

        <div className={s.bar} data-dirty={dirty || undefined}>
          <span className={s.state}>
            <span className={s.dot} />
            {dirty ? "Unsaved changes" : post ? "All changes saved" : "Not saved yet"}
          </span>
          <div style={{ flex: 1 }} />
          {post?.published ? (
            <>
              <button type="button" className="ad-btn ad-btn-secondary" disabled={pending} onClick={() => save(false)}>
                Unpublish
              </button>
              <button type="button" className="ad-btn ad-btn-primary" disabled={pending || !dirty} onClick={() => save(true)}>
                {pending ? "Saving…" : future ? "Update schedule" : "Update live post"}
              </button>
            </>
          ) : (
            <>
              <button type="button" className="ad-btn ad-btn-secondary" disabled={pending || (!dirty && !!post)} onClick={() => save(false)}>
                Save draft
              </button>
              {future && (
                <button type="button" className="ad-btn ad-btn-secondary" disabled={pending} onClick={() => save(true)}>
                  Schedule
                </button>
              )}
              <button type="button" className="ad-btn ad-btn-primary" disabled={pending} onClick={() => save(true, true)}>
                {pending ? "Saving…" : "Publish now"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Err({ children }: { children: React.ReactNode }) {
  return (
    <span className="ad-error">
      <CircleAlert size={13} />
      {children}
    </span>
  );
}
