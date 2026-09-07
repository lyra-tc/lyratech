import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./routing";

const intlMiddleware = createMiddleware(routing);

const SESSION_COOKIE = process.env.NEXT_PUBLIC_AUTH_COOKIE_NAME || "lyratech_session";

// Reachable without a session; everything else under /dashboard requires one.
const PUBLIC_DASHBOARD_PATHS = ["/dashboard/login", "/dashboard/register"];

function isPublicDashboardPath(pathname: string): boolean {
  return PUBLIC_DASHBOARD_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    // Presence check only — validity is confirmed by the protected layout's
    // auth.me() call. We deliberately do NOT redirect a request that *has* the
    // cookie away from /login: an expired cookie still exists in the browser,
    // and bouncing it to a protected page would loop against that layout.
    const hasSession = request.cookies.has(SESSION_COOKIE);
    const isPublic = isPublicDashboardPath(pathname);

    if (!hasSession && !isPublic) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard/login";
      url.search = "";
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/", "/((?!api|static|.*\\..*|_next).*)"],
};
