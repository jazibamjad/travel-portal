import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login"];

/**
 * Route gate (Next.js 16 renamed `middleware.ts` -> `proxy.ts`, `middleware()` -> `proxy()`).
 * Only checks for the *presence* of the session cookie — it's httpOnly so we can't read its
 * contents here, and the API itself is the actual authority: it rejects any request without a
 * valid session with 401, which each page's data-fetching surfaces as a redirect to /login.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  const hasSession = request.cookies.has("mgh_session");
  if (!hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
