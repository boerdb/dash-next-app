import { NextResponse } from "next/server";
import { fetchNearbyVisibility } from "@/lib/weer/nearby-visibility";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await fetchNearbyVisibility();
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=1800",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Zichtmetingen niet bereikbaar";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
