import { NextResponse } from "next/server";
import {
  fetchEnergieHistorieFromDb,
  fetchLatestWattFromDb,
} from "@/lib/db/historie-energie";
import { databaseRequiredResponse } from "@/lib/db/require-database";

export async function GET() {
  const needDb = databaseRequiredResponse("Energie historie");
  if (needDb) return needDb;

  try {
    const currentWatt = await fetchLatestWattFromDb();
    return NextResponse.json(await fetchEnergieHistorieFromDb(currentWatt));
  } catch (e) {
    console.error("Energie historie DB:", e);
    return NextResponse.json(
      { error: "Historie niet bereikbaar (database)" },
      { status: 502 }
    );
  }
}
