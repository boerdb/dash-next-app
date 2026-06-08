import { NextResponse } from "next/server";
import { fetchRainviewerRadar } from "@/lib/radar/rainviewer";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await fetchRainviewerRadar();
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Neerslagradar niet bereikbaar";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
