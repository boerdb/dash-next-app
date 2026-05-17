import { NextResponse } from "next/server";
import { fetchHarlingenTides } from "@/lib/tides/fetch-tides";

export const revalidate = 3600;

export async function GET() {
  try {
    const result = await fetchHarlingenTides();
    return NextResponse.json(result);
  } catch (e) {
    console.error("Getijden fout:", e);
    return NextResponse.json({ items: [], source: "rws" as const });
  }
}
