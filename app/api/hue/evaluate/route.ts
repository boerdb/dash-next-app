import { NextResponse } from "next/server";
import { jsonNoStore } from "@/lib/api/no-store";
import { isDirectDbEnabled } from "@/lib/db/pool";
import { fetchWeerLiveFromDb } from "@/lib/db/live-weer";
import { fetchLights } from "@/lib/hue/client";
import { processPendingResets } from "@/lib/hue/pending-reset";
import { evaluateHueRules } from "@/lib/hue/rules-engine";
import { getSettings, isConfigured } from "@/lib/hue/settings";

export const dynamic = "force-dynamic";

/** Handmatige evaluatie vanuit de UI; negeert cooldown + master-switch. */
export async function POST() {
  if (!isDirectDbEnabled()) {
    return NextResponse.json(
      { error: "DATABASE_URL niet geconfigureerd" },
      { status: 503 },
    );
  }
  const settings = await getSettings();
  if (!isConfigured(settings)) {
    return NextResponse.json({ error: "Hue Bridge niet geconfigureerd" }, { status: 503 });
  }

  try {
    const weather = await fetchWeerLiveFromDb();
    const lights = await fetchLights(settings);
    const restored = await processPendingResets(settings);
    const results = await evaluateHueRules(settings, weather, lights, { force: true });
    return jsonNoStore({
      evaluated: results.length,
      restored: restored.length,
      restoreResults: restored,
      results,
      weather: {
        illuminance_lux: weather.illuminance_lux ?? null,
        lightning_km: weather.lightning_km ?? null,
        lightning_storm_risk: weather.lightning_storm_risk ?? false,
        windgust_kmh: weather.windgust_kmh ?? null,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Evaluatie mislukt" },
      { status: 502 },
    );
  }
}
