import { NextResponse } from "next/server";
import { fetchHarlingenTides } from "@/lib/tides/open-meteo-client";

export const revalidate = 3600;

export async function GET() {
  try {
    const items = await fetchHarlingenTides();
    return NextResponse.json(items);
  } catch (e) {
    console.error("Getijden fout:", e);
    return NextResponse.json([]);
  }
}
