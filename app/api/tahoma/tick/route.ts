import { NextRequest, NextResponse } from "next/server";
import { jsonNoStore } from "@/lib/api/no-store";
import { isDirectDbEnabled } from "@/lib/db/pool";
import { fetchWeerLiveFromDb } from "@/lib/db/live-weer";
import { getSettings, isConfigured } from "@/lib/tahoma/settings";
import { fetchDevices } from "@/lib/tahoma/client";
import { evaluateRules } from "@/lib/tahoma/rules-engine";

export const dynamic = "force-dynamic";

/**
 * Cron-tick: evalueer Tahoma-regels tegen de actuele Ecowitt-weerdata.
 * Crontab (bijv. elke minuut):
 *   curl -sf -H "Authorization: Bearer $CRON_SECRET" http://127.0.0.1:3000/api/tahoma/tick
 */
export async function GET(req: NextRequest) {
  if (!isDirectDbEnabled()) {
    return NextResponse.json(
      { error: "DATABASE_URL niet geconfigureerd" },
      { status: 503 },
    );
  }

  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const settings = await getSettings();
  if (!isConfigured(settings) || !settings.enabled) {
    return jsonNoStore({ ok: true, skipped: true, reason: "uitgeschakeld of niet geconfigureerd" });
  }

  try {
    const weather = await fetchWeerLiveFromDb();
    const devices = await fetchDevices(settings);
    const results = await evaluateRules(settings, weather, devices);
    return jsonNoStore({
      ok: true,
      evaluated: results.length,
      triggered: results.filter((r) => r.status === "ok").length,
      failed: results.filter((r) => r.status === "error").length,
      results,
    });
  } catch (e) {
    console.error("Tahoma tick:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Tahoma-tick mislukt" },
      { status: 502 },
    );
  }
}
