import { NextResponse } from "next/server";
import { fetchBackend } from "@/lib/api/fetch-backend";
import { sanitizeWeerPayload } from "@/lib/api/sanitize";

export async function GET() {
  try {
    const res = await fetchBackend("api.php");
    if (!res.ok) {
      return NextResponse.json(
        { error: "Weerdata niet beschikbaar" },
        { status: res.status }
      );
    }
    const data = await res.json();
    return NextResponse.json(sanitizeWeerPayload(data));
  } catch {
    return NextResponse.json(
      { error: "Weerdata niet bereikbaar" },
      { status: 502 }
    );
  }
}
