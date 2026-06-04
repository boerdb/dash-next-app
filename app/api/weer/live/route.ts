import { NextResponse } from "next/server";
import { jsonNoStore } from "@/lib/api/no-store";
import { sanitizeWeerPayload } from "@/lib/api/sanitize";
import { fetchWeerLiveFromDb } from "@/lib/db/live-weer";
import { databaseRequiredResponse } from "@/lib/db/require-database";

export const dynamic = "force-dynamic";

export async function GET() {
  const needDb = databaseRequiredResponse("Weer live");
  if (needDb) return needDb;

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
