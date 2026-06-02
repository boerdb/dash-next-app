import { NextResponse } from "next/server";
import { fetchHarlingenTides } from "@/lib/tides/fetch-tides";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await fetchHarlingenTides();
    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800" },
    });
  } catch (e) {
    console.error("Getijden fout:", e);
    return NextResponse.json({ items: [], source: "rws" as const });
  }
}
