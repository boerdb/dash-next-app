import { NextResponse } from "next/server";
import { fetchBackend } from "@/lib/api/fetch-backend";
import { mapEnergieLive } from "@/lib/api/energie-map";
import type { EnergieApiRaw } from "@/lib/api/types";

export async function GET() {
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
