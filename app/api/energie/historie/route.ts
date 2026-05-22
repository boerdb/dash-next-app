import { NextResponse } from "next/server";
import { fetchBackend } from "@/lib/api/fetch-backend";
import { fetchEnergieHistorieFromDb } from "@/lib/db/historie-energie";
import { isDirectDbEnabled } from "@/lib/db/pool";

export async function GET() {
  if (isDirectDbEnabled()) {
    try {
      return NextResponse.json(await fetchEnergieHistorieFromDb());
    } catch (e) {
      console.error("Energie historie DB:", e);
      return NextResponse.json(
        { error: "Historie niet bereikbaar (database)" },
        { status: 502 }
      );
    }
  }

  try {
    const res = await fetchBackend("historie_energie.php");
    if (!res.ok) {
      return NextResponse.json({ error: "Historie niet beschikbaar" }, { status: res.status });
    }
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ error: "Historie niet bereikbaar" }, { status: 502 });
  }
}
