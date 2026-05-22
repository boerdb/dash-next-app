import { NextResponse } from "next/server";
import { fetchBackend } from "@/lib/api/fetch-backend";
import { mapEnergieLive } from "@/lib/api/energie-map";
import type { EnergieApiRaw } from "@/lib/api/types";
import { fetchEnergieLiveRaw } from "@/lib/db/energie-store";
import { isDirectDbEnabled } from "@/lib/db/pool";

export async function GET() {
  if (isDirectDbEnabled()) {
    try {
      const data = await fetchEnergieLiveRaw();
      return NextResponse.json(mapEnergieLive(data));
    } catch (e) {
      console.error("Energie live:", e);
      const message =
        e instanceof Error ? e.message : "Energiedata niet bereikbaar";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  try {
    const res = await fetchBackend("energie.php");
    if (!res.ok) {
      return NextResponse.json(
        { error: "Energiedata niet beschikbaar" },
        { status: res.status }
      );
    }
    const data = (await res.json()) as EnergieApiRaw;
    return NextResponse.json(mapEnergieLive(data));
  } catch {
    return NextResponse.json(
      { error: "Energiedata niet bereikbaar" },
      { status: 502 }
    );
  }
}
