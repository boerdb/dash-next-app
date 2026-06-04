import { NextResponse } from "next/server";
import { mapEnergieLive } from "@/lib/api/energie-map";
import { fetchEnergieLiveRaw } from "@/lib/db/energie-store";
import { databaseRequiredResponse } from "@/lib/db/require-database";

export async function GET() {
  const needDb = databaseRequiredResponse("Energie live");
  if (needDb) return needDb;

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
