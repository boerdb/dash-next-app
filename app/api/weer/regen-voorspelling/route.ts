import { NextResponse } from "next/server";
import { fetchHarlingenPrecipForecast } from "@/lib/precip-forecast/open-meteo-client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await fetchHarlingenPrecipForecast();
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600",
      },
    });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Regenvoorspelling niet bereikbaar";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
