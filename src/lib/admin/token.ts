/**
 * Signed admin session tokens (HMAC-SHA256 over Web Crypto), shared by the
 * proxy and server code. There is one admin account, configured with
 * ADMIN_USERNAME / ADMIN_PASSWORD / ADMIN_SESSION_SECRET. Each token carries
 * a fingerprint of the current credentials, so changing the password signs
 * every existing session out.
 */
export const SESSION_COOKIE = "ovdc_admin";

export interface AdminSession {
  /** username */
  u: string;
  /** expiry, unix seconds */
  exp: number;
  /** credentials fingerprint */
  v: string;
}

const enc = new TextEncoder();

export function adminConfig() {
  const username = process.env.ADMIN_USERNAME?.trim();
  const password = process.env.ADMIN_PASSWORD;
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!username || !password || !secret || secret.length < 32) return null;
  return { username, password, secret };
}

function b64url(bytes: ArrayBuffer | Uint8Array) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string) {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function hmac(secret: string, data: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}

/** Constant-time comparison of two byte arrays. */
export function safeEqual(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function fingerprint(cfg: NonNullable<ReturnType<typeof adminConfig>>) {
  return b64url(await hmac(cfg.secret, `v1:${cfg.username}:${cfg.password}`)).slice(0, 16);
}

export async function signSession(maxAgeSeconds: number) {
  const cfg = adminConfig();
  if (!cfg) throw new Error("Admin login is not configured");
  const body: AdminSession = { u: cfg.username, exp: Math.floor(Date.now() / 1000) + maxAgeSeconds, v: await fingerprint(cfg) };
  const payload = b64url(enc.encode(JSON.stringify(body)));
  return `${payload}.${b64url(await hmac(cfg.secret, payload))}`;
}

export async function verifySession(token: string | undefined | null): Promise<AdminSession | null> {
  const cfg = adminConfig();
  if (!cfg || !token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  try {
    if (!safeEqual(fromB64url(sig), await hmac(cfg.secret, payload))) return null;
    const s = JSON.parse(new TextDecoder().decode(fromB64url(payload))) as AdminSession;
    if (typeof s.exp !== "number" || s.exp * 1000 < Date.now()) return null;
    if (s.u !== cfg.username || s.v !== (await fingerprint(cfg))) return null;
    return s;
  } catch {
    return null;
  }
}

/** Checks a login attempt without leaking which field was wrong or how long the match was. */
export async function checkCredentials(username: string, password: string) {
  const cfg = adminConfig();
  if (!cfg) return false;
  const [a, b, c, d] = await Promise.all([
    hmac(cfg.secret, `u:${username.trim()}`),
    hmac(cfg.secret, `u:${cfg.username}`),
    hmac(cfg.secret, `p:${password}`),
    hmac(cfg.secret, `p:${cfg.password}`),
  ]);
  const okUser = safeEqual(a, b);
  const okPass = safeEqual(c, d);
  return okUser && okPass;
}
