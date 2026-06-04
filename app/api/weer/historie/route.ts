import { NextResponse } from "next/server";
import { jsonNoStore } from "@/lib/api/no-store";
import { fetchWeerHistorieFromDb } from "@/lib/db/historie-weer";
import { databaseRequiredResponse } from "@/lib/db/require-database";

export const dynamic = "force-dynamic";

export async function GET() {
  const needDb = databaseRequiredResponse("Weer historie");
  if (needDb) return needDb;

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
