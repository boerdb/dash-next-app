import { NextRequest, NextResponse } from "next/server";
import type { EnergieApiRaw } from "@/lib/api/types";
import { buildEnergieMaandResponse } from "@/lib/db/energie-dag-totalen";
import type { DagTotalenKwh } from "@/lib/energie/compute-dag-totalen";
import { fetchEnergieLiveRaw } from "@/lib/db/energie-store";
import { parseJaarMaand } from "@/lib/energie/maand-labels";
import { databaseRequiredResponse } from "@/lib/db/require-database";

function liveVandaagFromRaw(raw: EnergieApiRaw): DagTotalenKwh {
  const batterij_kwh =
    Math.round(
      (raw.batterijen ?? []).reduce(
        (s, b) => s + Number(b.vandaag_ontladen_kwh ?? 0),
        0
      ) * 100
    ) / 100;
  return {
    net_in_kwh: Number(raw.vandaag_stroom_in_kwh ?? 0),
    net_uit_kwh: Number(raw.vandaag_stroom_out_kwh ?? 0),
    batterij_kwh,
  };
}

export async function GET(req: NextRequest) {
  const needDb = databaseRequiredResponse("Energie maand");
  if (needDb) return needDb;

  const parsed = parseJaarMaand(
    req.nextUrl.searchParams.get("jaar"),
    req.nextUrl.searchParams.get("maand")
  );
  if (!parsed) {
    return NextResponse.json({ error: "Ongeldige jaar/maand" }, { status: 400 });
  }

  try {
    const { jaar, maand } = parsed;
    const now = new Date();
    const curJaar = Number(
      now.toLocaleString("en-CA", {
        timeZone: "Europe/Amsterdam",
        year: "numeric",
      })
    );
    const curMaand = Number(
      now.toLocaleString("en-CA", {
        timeZone: "Europe/Amsterdam",
        month: "numeric",
      })
    );

    let liveVandaag: DagTotalenKwh | null = null;
    if (jaar === curJaar && maand === curMaand) {
      const raw = await fetchEnergieLiveRaw();
      liveVandaag = liveVandaagFromRaw(raw);
    }

    const data = await buildEnergieMaandResponse(jaar, maand, liveVandaag);
    if (!data) {
      return NextResponse.json(
        { error: "Alleen de huidige en vorige maand beschikbaar" },
        { status: 400 }
      );
    }
    return NextResponse.json(data);
  } catch (e) {
    console.error("Energie maand:", e);
    return NextResponse.json(
      { error: "Maandoverzicht niet bereikbaar" },
      { status: 502 }
    );
  }
}
