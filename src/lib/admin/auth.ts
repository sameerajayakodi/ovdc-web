import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySession } from "./token";

export interface Admin {
  username: string;
  name: string;
  initials: string;
}

function toAdmin(username: string): Admin {
  const name = process.env.ADMIN_NAME?.trim() || "OVDC Admin";
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return { username, name, initials };
}

/** The signed-in admin, or null. Reads the request cookie, so call it inside <Suspense>. */
export async function getAdmin(): Promise<Admin | null> {
  const s = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  return s ? toAdmin(s.u) : null;
}

/**
 * Data Access Layer guard: every admin page and Server Action calls this.
 * The proxy already redirects signed-out visitors, but actions can be invoked
 * directly, so the check is repeated here.
 */
export async function requireAdmin(): Promise<Admin> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
