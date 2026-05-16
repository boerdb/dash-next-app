import { NextResponse } from "next/server";
import { fetchBackend } from "@/lib/api/fetch-backend";

export async function GET() {
  try {
    const res = await fetchBackend("historie.php");
    if (!res.ok) {
      return NextResponse.json({ error: "Historie niet beschikbaar" }, { status: res.status });
    }
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ error: "Historie niet bereikbaar" }, { status: 502 });
  }
}
