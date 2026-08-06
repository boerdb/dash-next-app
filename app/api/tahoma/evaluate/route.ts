import { NextResponse } from "next/server";
import { jsonNoStore } from "@/lib/api/no-store";
import { isDirectDbEnabled } from "@/lib/db/pool";
import { fetchWeerLiveFromDb } from "@/lib/db/live-weer";
import { getSettings, isConfigured } from "@/lib/tahoma/settings";
import { fetchDevices } from "@/lib/tahoma/client";
import { evaluateRules } from "@/lib/tahoma/rules-engine";

export const dynamic = "force-dynamic";

/** Handmatige evaluatie vanuit de UI ("Test nu"); negeert cooldown + master-switch. */
export async function POST() {
  if (!isDirectDbEnabled()) {
    return NextResponse.json(
      { error: "DATABASE_URL niet geconfigureerd" },
      { status: 503 },
    );
  }
  const settings = await getSettings();
  if (!isConfigured(settings)) {
    return NextResponse.json({ error: "Tahoma-box niet geconfigureerd" }, { status: 503 });
  }

  try {
    const weather = await fetchWeerLiveFromDb();
    const devices = await fetchDevices(settings);
    const results = await evaluateRules(settings, weather, devices, { force: true });
    return jsonNoStore({
      evaluated: results.length,
      results,
      weather: {
        windgust_kmh: weather.windgust_kmh ?? null,
        windspeed_kmh: weather.windspeed_kmh ?? null,
        solarradiation: weather.solarradiation ?? null,
        rainrate_mm: weather.rainrate_mm ?? null,
        lightning_km: weather.lightning_km ?? null,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Evaluatie mislukt" },
      { status: 502 },
    );
  }
}
