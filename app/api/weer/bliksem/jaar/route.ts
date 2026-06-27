import { NextRequest, NextResponse } from "next/server";
import { buildWeerBliksemJaarResponse } from "@/lib/db/weer-bliksem-store";
import { databaseRequiredResponse } from "@/lib/db/require-database";
import { parseJaar } from "@/lib/weer/regen-jaar-labels";

export async function GET(req: NextRequest) {
  const needDb = databaseRequiredResponse("Weer bliksem jaar");
  if (needDb) return needDb;

  const jaar = parseJaar(req.nextUrl.searchParams.get("jaar"));
  if (jaar == null) {
    return NextResponse.json({ error: "Ongeldig jaar" }, { status: 400 });
  }

  try {
    const data = await buildWeerBliksemJaarResponse(jaar);
    return NextResponse.json(data);
  } catch (e) {
    console.error("Weer bliksem jaar:", e);
    return NextResponse.json(
      { error: "Bliksemoverzicht niet bereikbaar" },
      { status: 502 }
    );
  }
}
