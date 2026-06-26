import { NextRequest, NextResponse } from "next/server";
import { supplementWeerFromGateway } from "@/lib/db/weer-store";
import { isDirectDbEnabled } from "@/lib/db/pool";

export const dynamic = "force-dynamic";

/**
 * Poll GW1100 LAN-API voor WH57 / onweer-aanvulling.
 * Crontab (elke minuut): curl -sf -H "Authorization: Bearer $CRON_SECRET" http://127.0.0.1:3000/api/weer/sync-gateway
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
    const updated = await supplementWeerFromGateway();
    if (!updated) {
      return NextResponse.json({ ok: false, reason: "geen gateway of cache" });
    }
    return NextResponse.json({
      ok: true,
      lightning_km: updated.lightning_km,
      lightning_storm_risk: updated.lightning_storm_risk,
    });
  } catch (e) {
    console.error("Weer sync-gateway:", e);
    const message = e instanceof Error ? e.message : "Sync mislukt";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
