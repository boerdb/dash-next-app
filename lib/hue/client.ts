import "server-only";
import http from "node:http";
import {
  buildHueStateBody,
  capabilitiesFromType,
  type HueLightStateInput,
} from "@/lib/hue/colors";
import type { HueLight, HueSettings } from "@/lib/hue/types";
import type { HueLightStateSnapshot } from "@/lib/hue/snapshot";

/**
 * Philips Hue Bridge local REST API.
 * Spec: https://developers.meethue.com/develop/hue-api-v2/
 * (v1 local API blijft breed ondersteund op de bridge)
 */

const TIMEOUT_MS = 8_000;

interface HueApiResult {
  success?: Record<string, unknown>;
  error?: { type: number; address: string; description: string };
}

interface RawLight {
  name?: string;
  type?: string;
  modelid?: string;
  manufacturername?: string;
  state?: {
    on?: boolean;
    bri?: number;
    reachable?: boolean;
    xy?: [number, number];
    ct?: number;
  };
}

function apiBase(ip: string, username?: string): string {
  const base = `http://${ip.trim()}/api`;
  return username?.trim() ? `${base}/${username.trim()}` : base;
}

function request(
  url: string,
  opts: { method?: "GET" | "POST" | "PUT"; body?: unknown } = {},
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const bodyStr = opts.body !== undefined ? JSON.stringify(opts.body) : undefined;

    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || 80,
        path: parsed.pathname,
        method: opts.method ?? "GET",
        headers: bodyStr
          ? {
              "Content-Type": "application/json",
              "Content-Length": Buffer.byteLength(bodyStr).toString(),
            }
          : { Accept: "application/json" },
        timeout: TIMEOUT_MS,
      },
      (res) => {
        let chunks = "";
        res.on("data", (c: Buffer) => (chunks += c.toString("utf8")));
        res.on("end", () => {
          if (!chunks) {
            resolve(null);
            return;
          }
          try {
            resolve(JSON.parse(chunks));
          } catch {
            reject(new Error("Ongeldig antwoord van Hue Bridge"));
          }
        });
      },
    );

    req.on("error", (e) => reject(new Error(`Hue Bridge niet bereikbaar: ${e.message}`)));
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Hue Bridge timeout"));
    });

    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

function firstError(results: HueApiResult[]): string | null {
  for (const r of results) {
    if (r.error) return r.error.description;
  }
  return null;
}

/** Maak application key aan (link-knop op bridge moet ingedrukt zijn). */
export async function registerUsername(
  bridgeIp: string,
  devicetype = "dash-next-app#server",
): Promise<string> {
  const data = (await request(apiBase(bridgeIp), {
    method: "POST",
    body: { devicetype },
  })) as HueApiResult[];

  if (!Array.isArray(data)) {
    throw new Error("Onverwacht antwoord bij registratie");
  }

  const err = firstError(data);
  if (err) throw new Error(err);

  const username = data.find((r) => r.success?.username)?.success?.username;
  if (typeof username !== "string" || !username) {
    throw new Error("Geen username ontvangen van bridge");
  }
  return username;
}

export async function fetchBridgeName(settings: HueSettings): Promise<string | null> {
  const data = (await request(`${apiBase(settings.bridgeIp, settings.username)}/config`)) as {
    name?: string;
  } | null;
  return data?.name ?? null;
}

export async function fetchLights(settings: HueSettings): Promise<HueLight[]> {
  const data = (await request(`${apiBase(settings.bridgeIp, settings.username)}/lights`)) as
    | Record<string, RawLight>
    | HueApiResult[];

  if (Array.isArray(data)) {
    const err = firstError(data as HueApiResult[]);
    throw new Error(err ?? "Lampen ophalen mislukt");
  }

  return Object.entries(data)
    .map(([id, raw]) => normalizeLight(id, raw))
    .sort((a, b) => a.name.localeCompare(b.name, "nl"));
}

export async function setLightState(
  settings: HueSettings,
  lightId: string,
  state: HueLightStateInput,
  lightType?: string,
): Promise<void> {
  const cap = capabilitiesFromType(lightType ?? "");
  const body = buildHueStateBody(state, cap);

  const data = (await request(
    `${apiBase(settings.bridgeIp, settings.username)}/lights/${lightId}/state`,
    { method: "PUT", body },
  )) as HueApiResult[];

  if (!Array.isArray(data)) {
    throw new Error("Onverwacht antwoord bij lampactie");
  }

  const err = firstError(data);
  if (err) throw new Error(err);
}

/** Zet lamp terug naar opgeslagen snapshot (exact xy/ct/on/bri). */
export async function restoreLightSnapshot(
  settings: HueSettings,
  lightId: string,
  snapshot: HueLightStateSnapshot,
  lightType?: string,
): Promise<void> {
  const body: Record<string, unknown> = { on: snapshot.on };
  if (!snapshot.on) {
    await setLightStateRaw(settings, lightId, body);
    return;
  }
  if (snapshot.bri != null) body.bri = snapshot.bri;
  if (snapshot.xy) body.xy = snapshot.xy;
  else if (snapshot.ct) body.ct = snapshot.ct;
  await setLightStateRaw(settings, lightId, body);
}

async function setLightStateRaw(
  settings: HueSettings,
  lightId: string,
  body: Record<string, unknown>,
): Promise<void> {
  const data = (await request(
    `${apiBase(settings.bridgeIp, settings.username)}/lights/${lightId}/state`,
    { method: "PUT", body },
  )) as HueApiResult[];

  if (!Array.isArray(data)) {
    throw new Error("Onverwacht antwoord bij lampactie");
  }

  const err = firstError(data);
  if (err) throw new Error(err);
}

export async function ping(settings: HueSettings): Promise<void> {
  await fetchLights(settings);
}

function normalizeLight(id: string, raw: RawLight): HueLight {
  const type = raw.type ?? "Onbekend";
  return {
    id,
    name: raw.name ?? `Lamp ${id}`,
    type,
    modelid: raw.modelid ?? "",
    manufacturername: raw.manufacturername ?? "",
    capabilities: capabilitiesFromType(type),
    state: {
      on: raw.state?.on ?? false,
      bri: typeof raw.state?.bri === "number" ? raw.state.bri : null,
      xy: Array.isArray(raw.state?.xy) && raw.state.xy.length === 2 ? raw.state.xy : null,
      ct: typeof raw.state?.ct === "number" ? raw.state.ct : null,
      reachable: raw.state?.reachable ?? false,
    },
  };
}
