/** Matterport and Kuula tour players are the only pages the site will frame. */
export function embedSrc(url: string) {
  try {
    const u = new URL(url.trim());
    if (u.protocol !== "https:") return null;
    if (u.hostname === "my.matterport.com" && u.pathname.startsWith("/show")) return u.toString();
    if (u.hostname === "kuula.co" || u.hostname.endsWith(".kuula.co")) {
      // A share link (/post/…) becomes the embeddable player (/share/…).
      if (u.pathname.startsWith("/post/")) u.pathname = u.pathname.replace("/post/", "/share/");
      return u.toString();
    }
  } catch {}
  return null;
}

export function embedHost(url: string) {
  const src = embedSrc(url);
  return src ? (new URL(src).hostname.includes("matterport") ? "Matterport" : "Kuula") : null;
}
