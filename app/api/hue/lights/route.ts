import { NextResponse } from "next/server";
import { jsonNoStore } from "@/lib/api/no-store";
import { fetchLights } from "@/lib/hue/client";
import { getSettings, isConfigured } from "@/lib/hue/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getSettings();
  if (!isConfigured(settings)) {
    return NextResponse.json({ error: "Hue Bridge niet geconfigureerd" }, { status: 503 });
  }

  try {
    const lights = await fetchLights(settings);
    return jsonNoStore({ lights, updatedAt: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Lampen ophalen mislukt" },
      { status: 502 },
    );
  }
}
