import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, SIGNED_IN_FLAG, verifySession } from "@/lib/admin/token";

/** Keeps /admin behind the admin login. Pages and actions check again (requireAdmin). */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLogin = pathname === "/admin/login";
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  // Set by the login action on its redirect: the browser should now be sending the session cookie.
  const justSignedIn = request.nextUrl.searchParams.has(SIGNED_IN_FLAG);
  const clean = new URL(request.url);
  clean.searchParams.delete(SIGNED_IN_FLAG);
  const search = clean.search;

  let res: NextResponse;
  if (!session && !isLogin) {
    const url = new URL("/admin/login", request.url);
    if (pathname !== "/admin") url.searchParams.set("next", pathname + search);
    // Signed in a moment ago, yet no cookie came back: the browser (or an extension) refused it.
    if (justSignedIn) url.searchParams.set("cookie", "blocked");
    res = NextResponse.redirect(url);
  } else if (session && justSignedIn) {
    res = NextResponse.redirect(clean);
  } else if (session && isLogin) {
    res = NextResponse.redirect(new URL("/admin", request.url));
  } else {
    res = NextResponse.next();
  }
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
