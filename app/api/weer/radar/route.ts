import { NextResponse } from "next/server";
import { jsonNoStore } from "@/lib/api/no-store";
import { fetchRainviewerRadar } from "@/lib/radar/rainviewer";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await fetchRainviewerRadar();
    return jsonNoStore(data);
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Neerslagradar niet beschikbaar";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
