import "server-only";
import { readJson, writeJson } from "@/lib/tahoma/storage";
import { defaultHueSettings, type HueSettings } from "@/lib/hue/types";

const FILE = "hue-settings.json";

let cached: HueSettings | null = null;

function fromEnv(): Partial<HueSettings> {
  const out: Partial<HueSettings> = {};
  if (process.env.HUE_BRIDGE_IP) out.bridgeIp = process.env.HUE_BRIDGE_IP.trim();
  if (process.env.HUE_USERNAME) out.username = process.env.HUE_USERNAME.trim();
  if (process.env.HUE_ENABLED === "1") out.enabled = true;
  return out;
}

export async function getSettings(): Promise<HueSettings> {
  if (cached) return cached;
  const stored = await readJson<Partial<HueSettings>>(FILE, {});
  cached = { ...defaultHueSettings, ...fromEnv(), ...stored };
  return cached;
}

export async function saveSettings(value: HueSettings): Promise<HueSettings> {
  const merged: HueSettings = { ...defaultHueSettings, ...value };
  await writeJson(FILE, merged);
  cached = merged;
  return merged;
}

export function isConfigured(s: HueSettings): boolean {
  return Boolean(s.bridgeIp.trim() && s.username.trim());
}
