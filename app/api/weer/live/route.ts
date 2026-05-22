import { NextResponse } from "next/server";
import { fetchBackend } from "@/lib/api/fetch-backend";
import { jsonNoStore } from "@/lib/api/no-store";
import { sanitizeWeerPayload } from "@/lib/api/sanitize";
import { fetchWeerLiveFromDb } from "@/lib/db/live-weer";
import { isDirectDbEnabled } from "@/lib/db/pool";

export const dynamic = "force-dynamic";

export async function GET() {
  if (isDirectDbEnabled()) {
    try {
      const live = await fetchWeerLiveFromDb();
      return jsonNoStore(sanitizeWeerPayload(live as Record<string, unknown>));
    } catch (e) {
      console.error("Weer live DB:", e);
      return NextResponse.json(
        { error: "Weerdata niet bereikbaar (database)" },
        { status: 502 }
      );
    }
  }

  try {
    const res = await fetchBackend("api.php");
    if (!res.ok) {
      return NextResponse.json(
        { error: "Weerdata niet beschikbaar" },
        { status: res.status }
      );
    }
    const data = await res.json();
    return NextResponse.json(sanitizeWeerPayload(data));
  } catch {
    return NextResponse.json(
      { error: "Weerdata niet bereikbaar" },
      { status: 502 }
    );
  }
}
