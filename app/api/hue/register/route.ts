import { NextResponse } from "next/server";
import { jsonNoStore } from "@/lib/api/no-store";
import { registerUsername } from "@/lib/hue/client";
import { getSettings, saveSettings } from "@/lib/hue/settings";

export const dynamic = "force-dynamic";

/** Registreer application key (link-knop op bridge moet ingedrukt zijn). */
export async function POST() {
  const settings = await getSettings();
  if (!settings.bridgeIp.trim()) {
    return NextResponse.json({ error: "Bridge-IP ontbreekt" }, { status: 400 });
  }

  try {
    const username = await registerUsername(settings.bridgeIp);
    const saved = await saveSettings({ ...settings, username });
    return jsonNoStore({
      ok: true,
      username: saved.username,
      configured: true,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Koppelen mislukt" },
      { status: 502 },
    );
  }
}
