import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  hasCronSecret,
  verifySessionToken,
} from "@/lib/auth/session";

/**
 * Energie, Tahoma en Hue alleen na inloggen; Weer blijft openbaar.
 * Cronjobs (ingest/tick) komen binnen met hun Bearer-geheim.
 */
export async function proxy(request: NextRequest) {
  if (hasCronSecret(request.headers.get("authorization"))) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (await verifySessionToken(token)) {
    return NextResponse.next();
  }

  const { pathname, search } = request.nextUrl;
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Inloggen vereist" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname + search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/energie/:path*",
    "/tahoma/:path*",
    "/hue/:path*",
    "/api/energie/:path*",
    "/api/tahoma/:path*",
    "/api/hue/:path*",
  ],
};
