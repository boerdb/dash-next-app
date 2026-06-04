import "server-only";
import { NextResponse } from "next/server";
import { isDirectDbEnabled } from "@/lib/db/pool";

/** API-routes vereisen DATABASE_URL; er is geen PHP-fallback meer. */
export function databaseRequiredResponse(
  service = "Deze API"
): NextResponse | null {
  if (isDirectDbEnabled()) return null;
  return NextResponse.json(
    { error: `${service} vereist DATABASE_URL (MariaDB)` },
    { status: 503 }
  );
}
