import { NextResponse } from "next/server";
import { jsonNoStore } from "@/lib/api/no-store";
import { getSettings, isConfigured } from "@/lib/tahoma/settings";
import { fetchDevices, ping, resetClientCache } from "@/lib/tahoma/client";
import type { TahomaStatus } from "@/lib/tahoma/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getSettings();
  const configured = isConfigured(settings);

  if (!configured) {
    const status: TahomaStatus = {
      configured: false,
      enabled: false,
      connected: false,
      baseUrl: settings.baseUrl,
      deviceCount: null,
      error: "Nog niet geconfigureerd (vul base-url, gebruiker en wachtwoord in)",
      lastCheckedAt: new Date().toISOString(),
    };
    return jsonNoStore(status);
  }

  try {
    const devices = await fetchDevices(settings);
    const status: TahomaStatus = {
      configured: true,
      enabled: settings.enabled,
      connected: true,
      baseUrl: settings.baseUrl,
      deviceCount: devices.length,
      error: null,
      lastCheckedAt: new Date().toISOString(),
    };
    return jsonNoStore(status);
  } catch (e) {
    resetClientCache();
    const status: TahomaStatus = {
      configured: true,
      enabled: settings.enabled,
      connected: false,
      baseUrl: settings.baseUrl,
      deviceCount: null,
      error: e instanceof Error ? e.message : "Verbinding met Tahoma-box mislukt",
      lastCheckedAt: new Date().toISOString(),
    };
    return jsonNoStore(status, { status: 502 });
  }
}
