import { NextResponse } from "next/server";
import { jsonNoStore } from "@/lib/api/no-store";
import { getSettings, saveSettings, isConfigured } from "@/lib/tahoma/settings";
import { resetClientCache } from "@/lib/tahoma/client";
import { defaultTahomaSettings, type TahomaSettings } from "@/lib/tahoma/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getSettings();
  return jsonNoStore({
    baseUrl: settings.baseUrl,
    enabled: settings.enabled,
    pollIntervalSec: settings.pollIntervalSec,
    hasToken: settings.token.length > 0,
    configured: isConfigured(settings),
  });
}

export async function PUT(req: Request) {
  let body: Partial<TahomaSettings>;
  try {
    body = (await req.json()) as Partial<TahomaSettings>;
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 });
  }

  const current = await getSettings();
  const next: TahomaSettings = {
    ...defaultTahomaSettings,
    ...current,
    ...body,
    // Leeg token-veld = behoud bestaande (client stuurt token nooit terug).
    token:
      body.token !== undefined && body.token !== ""
        ? body.token.trim()
        : current.token,
    pollIntervalSec:
      body.pollIntervalSec && Number.isFinite(body.pollIntervalSec) && body.pollIntervalSec > 0
        ? Math.round(body.pollIntervalSec)
        : current.pollIntervalSec,
  };

  resetClientCache();
  const saved = await saveSettings(next);
  return jsonNoStore({
    baseUrl: saved.baseUrl,
    enabled: saved.enabled,
    pollIntervalSec: saved.pollIntervalSec,
    hasToken: saved.token.length > 0,
    configured: isConfigured(saved),
  });
}
