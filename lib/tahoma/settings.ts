import "server-only";
import { readJson, writeJson } from "@/lib/tahoma/storage";
import { defaultTahomaSettings, type TahomaSettings } from "@/lib/tahoma/types";

const FILE = "tahoma-settings.json";

let cached: TahomaSettings | null = null;

/** Initialiseer vanuit env-variabelen als er nog geen bestand is. */
function fromEnv(): Partial<TahomaSettings> {
  const env = process.env;
  const out: Partial<TahomaSettings> = {};
  if (env.TAHOMA_BASE_URL) out.baseUrl = env.TAHOMA_BASE_URL.trim();
  if (env.TAHOMA_TOKEN) out.token = env.TAHOMA_TOKEN.trim();
  if (env.TAHOMA_ENABLED === "1") out.enabled = true;
  if (env.TAHOMA_POLL_INTERVAL_SEC) {
    const n = Number(env.TAHOMA_POLL_INTERVAL_SEC);
    if (Number.isFinite(n) && n > 0) out.pollIntervalSec = n;
  }
  return out;
}

export async function getSettings(): Promise<TahomaSettings> {
  if (cached) return cached;
  const stored = await readJson<Partial<TahomaSettings> & { password?: string; username?: string }>(
    FILE,
    {},
  );
  // Migratie: oude username/password-settings negeren; token is leidend.
  const { password: _p, username: _u, ...rest } = stored;
  cached = { ...defaultTahomaSettings, ...fromEnv(), ...rest };
  return cached;
}

export async function saveSettings(value: TahomaSettings): Promise<TahomaSettings> {
  const merged: TahomaSettings = { ...defaultTahomaSettings, ...value };
  if (!merged.baseUrl.trim() || !merged.token.trim()) merged.enabled = false;
  await writeJson(FILE, merged);
  cached = merged;
  return merged;
}

/** Of de box geconfigureerd is (base-url + developer-token). */
export function isConfigured(s: TahomaSettings): boolean {
  return Boolean(s.baseUrl.trim() && s.token.trim());
}
