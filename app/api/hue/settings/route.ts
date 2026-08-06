import { NextResponse } from "next/server";
import { jsonNoStore } from "@/lib/api/no-store";
import { getSettings, saveSettings, isConfigured } from "@/lib/hue/settings";
import { defaultHueSettings, type HueSettings } from "@/lib/hue/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getSettings();
  return jsonNoStore({
    bridgeIp: settings.bridgeIp,
    hasUsername: settings.username.length > 0,
    configured: isConfigured(settings),
  });
}

export async function PUT(req: Request) {
  let body: Partial<HueSettings>;
  try {
    body = (await req.json()) as Partial<HueSettings>;
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 });
  }

  const current = await getSettings();
  const next: HueSettings = {
    ...defaultHueSettings,
    ...current,
    ...body,
    username:
      body.username !== undefined && body.username !== ""
        ? body.username.trim()
        : current.username,
    bridgeIp: body.bridgeIp?.trim() || current.bridgeIp,
  };

  const saved = await saveSettings(next);
  return jsonNoStore({
    bridgeIp: saved.bridgeIp,
    hasUsername: saved.username.length > 0,
    configured: isConfigured(saved),
  });
}
