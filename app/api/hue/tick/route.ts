import { NextRequest, NextResponse } from "next/server";
import { jsonNoStore } from "@/lib/api/no-store";
import { isDirectDbEnabled } from "@/lib/db/pool";
import { fetchWeerLiveFromDb } from "@/lib/db/live-weer";
import { fetchLights } from "@/lib/hue/client";
import { processPendingResets } from "@/lib/hue/pending-reset";
import { evaluateHueRules } from "@/lib/hue/rules-engine";
import { getSettings, isConfigured } from "@/lib/hue/settings";

export const dynamic = "force-dynamic";

/**
 * Cron-tick: evalueer Hue-regels tegen actuele weerdata.
 * Crontab (bijv. elke minuut):
 *   curl -sf -H "Authorization: Bearer $CRON_SECRET" http://127.0.0.1:3000/api/hue/tick
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
    const lights = await fetchLights(settings);
    const restored = await processPendingResets(settings);
    const results = await evaluateHueRules(settings, weather, lights);
    return jsonNoStore({
      ok: true,
      restored: restored.length,
      evaluated: results.length,
      triggered: results.filter((r) => r.status === "ok").length,
      failed: results.filter((r) => r.status === "error").length,
      restoreResults: restored,
      results,
    });
  } catch (e) {
    console.error("Hue tick:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Hue-tick mislukt" },
      { status: 502 },
    );
  }
}
