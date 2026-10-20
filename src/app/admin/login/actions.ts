"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { SESSION_COOKIE, adminConfig, checkCredentials, signSession } from "@/lib/admin/token";

export interface LoginState {
  error?: string;
  username?: string;
}

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 5;
/** Failed attempts per client IP on this server instance (best effort brake on guessing). */
const fails = new Map<string, { n: number; first: number }>();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function safeNext(next: string) {
  return next.startsWith("/admin") && !next.startsWith("//") && !next.startsWith("/admin/login") ? next : "/admin";
}

async function audit(actor: string, action: string, detail: Record<string, unknown>) {
  if (!db) return;
  await db
    .insert(schema.activity)
    .values({ actor, entity: "auth", ref: actor, action, detail })
    .catch(() => {});
}

export async function login(_prev: LoginState, fd: FormData): Promise<LoginState> {
  const username = String(fd.get("username") ?? "").slice(0, 100);
  const password = String(fd.get("password") ?? "").slice(0, 200);
  const remember = fd.get("remember") === "on";
  const next = safeNext(String(fd.get("next") ?? ""));

  if (!adminConfig()) return { error: "Admin sign-in is not configured on this server.", username };
  if (!username || !password) return { error: "Enter your username and password.", username };

  const ip = ((await headers()).get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  const now = Date.now();
  const rec = fails.get(ip);
  if (rec && now - rec.first < WINDOW_MS && rec.n >= MAX_FAILS) {
    const mins = Math.ceil((rec.first + WINDOW_MS - now) / 60000);
    return { error: `Too many failed attempts. Try again in ${mins} min.`, username };
  }

  if (!(await checkCredentials(username, password))) {
    const r = rec && now - rec.first < WINDOW_MS ? rec : { n: 0, first: now };
    r.n += 1;
    fails.set(ip, r);
    await audit(username.slice(0, 40) || "unknown", "failed sign-in", { ip });
    await sleep(500 + Math.random() * 400);
    return { error: "Username or password is incorrect.", username };
  }

  fails.delete(ip);
  const maxAge = remember ? 30 * 24 * 3600 : 12 * 3600;
  (await cookies()).set(SESSION_COOKIE, await signSession(maxAge), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    ...(remember ? { maxAge } : {}),
  });
  await audit(username.trim(), "signed in", { ip, remember });
  redirect(next);
}
