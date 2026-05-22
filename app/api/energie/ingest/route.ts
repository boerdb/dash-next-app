import { NextRequest, NextResponse } from "next/server";
import { fetchEnergieLiveRaw } from "@/lib/db/energie-store";
import { isDirectDbEnabled } from "@/lib/db/pool";

export const dynamic = "force-dynamic";

/**
 * Vervangt cron save_energy.php: elke 5 min aanroepen zodat historie loopt
 * ook als het dashboard dicht is.
 *
 * Voorbeeld crontab (elke 5 min):
 *   curl -sf -H "Authorization: Bearer GEHEIM" http://127.0.0.1:3000/api/energie/ingest
 */
export async function GET(req: NextRequest) {
  if (!isDirectDbEnabled()) {
    return NextResponse.json(
      { error: "DATABASE_URL niet geconfigureerd" },
      { status: 503 }
    );
  }

  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    await fetchEnergieLiveRaw();
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Energie ingest:", e);
    const message = e instanceof Error ? e.message : "Ingest mislukt";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
