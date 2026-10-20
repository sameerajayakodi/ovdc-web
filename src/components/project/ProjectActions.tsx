"use client";

import { usePrefs } from "@/components/providers/Preferences";
import { IconHeart, IconShare } from "@/components/ui/Icons";

/** Save to shortlist + share (native share sheet on phones, copy link elsewhere). */
export function ShortlistShare({ id, name, path }: { id: string; name: string; path: string }) {
  const { shortlist, toggleShortlist, toast } = usePrefs();
  const saved = shortlist.includes(id);

  async function share() {
    const url = window.location.origin + path;
    if (navigator.share) {
      try {
        await navigator.share({ title: name, url });
      } catch {
        /* dismissed */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast(`Link copied: ${url.replace(/^https?:\/\//, "")}`);
    } catch {
      toast("Couldn’t copy the link");
    }
  }

  const btn: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    minHeight: 44,
    padding: "0 14px",
    border: "1px solid var(--color-divider)",
    background: "none",
    font: "600 12px var(--font-label)",
    letterSpacing: ".08em",
    textTransform: "uppercase",
    cursor: "pointer",
  };

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <button
        type="button"
        style={btn}
        aria-pressed={saved}
        onClick={() => toast(toggleShortlist(id) ? `${name} saved to your shortlist` : "Removed from shortlist")}
      >
        <IconHeart filled={saved} />
        {saved ? "Saved" : "Save"}
      </button>
      <button type="button" style={btn} onClick={share}>
        <IconShare />
        Share
      </button>
    </div>
  );
}
