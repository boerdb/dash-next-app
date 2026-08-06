import { jsonNoStore } from "@/lib/api/no-store";
import { fetchBridgeName, fetchLights } from "@/lib/hue/client";
import { getSettings, isConfigured } from "@/lib/hue/settings";
import type { HueStatus } from "@/lib/hue/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getSettings();
  const configured = isConfigured(settings);

  if (!configured) {
    const status: HueStatus = {
      configured: false,
      connected: false,
      bridgeIp: settings.bridgeIp,
      bridgeName: null,
      lightCount: null,
      error: "Nog niet geconfigureerd (bridge-IP en application key)",
      lastCheckedAt: new Date().toISOString(),
    };
    return jsonNoStore(status);
  }

  try {
    const [lights, bridgeName] = await Promise.all([
      fetchLights(settings),
      fetchBridgeName(settings).catch(() => null),
    ]);
    const status: HueStatus = {
      configured: true,
      connected: true,
      bridgeIp: settings.bridgeIp,
      bridgeName,
      lightCount: lights.length,
      error: null,
      lastCheckedAt: new Date().toISOString(),
    };
    return jsonNoStore(status);
  } catch (e) {
    const status: HueStatus = {
      configured: true,
      connected: false,
      bridgeIp: settings.bridgeIp,
      bridgeName: null,
      lightCount: null,
      error: e instanceof Error ? e.message : "Verbinding met Hue Bridge mislukt",
      lastCheckedAt: new Date().toISOString(),
    };
    return jsonNoStore(status, { status: 502 });
  }
}
