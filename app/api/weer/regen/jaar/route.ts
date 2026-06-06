import { NextRequest, NextResponse } from "next/server";
import { buildWeerRegenJaarResponse } from "@/lib/db/weer-regen-store";
import { databaseRequiredResponse } from "@/lib/db/require-database";
import { parseJaar } from "@/lib/weer/regen-jaar-labels";

export async function GET(req: NextRequest) {
  const needDb = databaseRequiredResponse("Weer regen jaar");
  if (needDb) return needDb;

  const jaar = parseJaar(req.nextUrl.searchParams.get("jaar"));
  if (jaar == null) {
    return NextResponse.json({ error: "Ongeldig jaar" }, { status: 400 });
  }

  try {
    const data = await buildWeerRegenJaarResponse(jaar);
    return NextResponse.json(data);
  } catch (e) {
    console.error("Weer regen jaar:", e);
    return NextResponse.json(
      { error: "Regenoverzicht niet bereikbaar" },
      { status: 502 }
    );
  }
}
