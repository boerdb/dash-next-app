import { NextResponse } from "next/server";
import { fetchBackend } from "@/lib/api/fetch-backend";
import { jsonNoStore } from "@/lib/api/no-store";
import { fetchWeerHistorieFromDb } from "@/lib/db/historie-weer";
import { isDirectDbEnabled } from "@/lib/db/pool";

export async function GET() {
  if (isDirectDbEnabled()) {
    try {
      return jsonNoStore(await fetchWeerHistorieFromDb());
    } catch (e) {
      console.error("Weer historie DB:", e);
      return NextResponse.json(
        { error: "Historie niet bereikbaar (database)" },
        { status: 502 }
      );
    }
  }

  try {
    const res = await fetchBackend("historie.php");
    if (!res.ok) {
      return NextResponse.json({ error: "Historie niet beschikbaar" }, { status: res.status });
    }
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ error: "Historie niet bereikbaar" }, { status: 502 });
  }
}
