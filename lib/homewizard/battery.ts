import { fetchJsonLocal } from "@/lib/homewizard/http-insecure";

export interface HomeWizardBatteryV1Raw {
  active_power_w?: number;
  state_of_charge?: number;
  state_of_charge_pct?: number;
  battery_percentage?: number;
}

export interface HomeWizardBatteryV2Measurement {
  power_w?: number;
  state_of_charge_pct?: number;
}

export interface HomeWizardP1Batteries {
  mode?: string;
  battery_count?: number;
  power_w?: number;
}

export interface BatterijLive {
  id: string;
  soc: number | null;
  vermogen_w: number;
  bereikbaar: boolean;
  /** Korte status voor de UI (bijv. ontbrekende token). */
  melding?: string;
}

export interface BatterijGroep {
  mode: string;
  aantal: number;
  vermogen_w: number;
  bereikbaar: boolean;
}

export interface BatterijFetchResult {
  batterijen: BatterijLive[];
  groep: BatterijGroep | null;
  hint: string | null;
}

export const DEFAULT_BATTERY_URLS = [
  "https://192.168.1.179",
  "https://192.168.1.170",
] as const;

const V2_HEADERS = (token: string) => ({
  Authorization: `Bearer ${token}`,
  "X-Api-Version": "2",
});

export function parseBatteryUrls(value: string | undefined): string[] {
  if (value === "") return [];
  if (!value?.trim()) return [...DEFAULT_BATTERY_URLS];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function parseBatteryTokens(value: string | undefined): string[] {
  if (!value?.trim()) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export interface BatteryEndpoint {
  id: string;
  v1Url: string | null;
  v2Url: string;
  token: string | undefined;
}

/** Laatste octet van het IP (bijv. 179 uit 192.168.1.179). */
export function batteryIdFromUrl(url: string): string {
  try {
    const host = new URL(url.includes("://") ? url : `https://${url}`).hostname;
    const parts = host.split(".");
    return parts[parts.length - 1] ?? host;
  } catch {
    return url;
  }
}

export function normalizeBatteryEndpoint(url: string): {
  v1Url: string | null;
  v2Url: string;
} {
  const withProto = url.includes("://") ? url : `https://${url}`;
  const u = new URL(withProto);
  if (u.pathname.endsWith("/api/v1/data")) {
    return {
      v1Url: u.toString(),
      v2Url: `https://${u.hostname}/api/measurement`,
    };
  }
  if (u.pathname.includes("/api/measurement")) {
    const v2Url =
      u.protocol === "https:"
        ? u.toString()
        : `https://${u.hostname}/api/measurement`;
    return { v1Url: null, v2Url };
  }
  return {
    v1Url: `http://${u.hostname}/api/v1/data`,
    v2Url: `https://${u.hostname}/api/measurement`,
  };
}

export function buildBatteryEndpoints(
  urls: string[],
  tokens: string[]
): BatteryEndpoint[] {
  return urls.map((url, index) => {
    const { v1Url, v2Url } = normalizeBatteryEndpoint(url);
    return {
      id: batteryIdFromUrl(url),
      v1Url,
      v2Url,
      token: tokens[index] ?? tokens[0],
    };
  });
}

export function p1BatteriesUrl(p1DataUrl: string): string {
  const u = new URL(p1DataUrl);
  return `https://${u.hostname}/api/batteries`;
}

export function parseSoc(
  raw: HomeWizardBatteryV1Raw | HomeWizardBatteryV2Measurement
): number | null {
  const candidates = [
    "state_of_charge" in raw ? raw.state_of_charge : undefined,
    raw.state_of_charge_pct,
    "battery_percentage" in raw
      ? raw.battery_percentage
      : undefined,
  ];
  for (const v of candidates) {
    if (v == null || Number.isNaN(Number(v))) continue;
    const n = Number(v);
    if (n >= 0 && n <= 100) return Math.round(n);
  }
  return null;
}

export function mapBatteryV1(
  raw: HomeWizardBatteryV1Raw | null,
  id: string,
  melding?: string
): BatterijLive {
  if (!raw) {
    return {
      id,
      soc: null,
      vermogen_w: 0,
      bereikbaar: false,
      melding: melding ?? "Niet bereikbaar",
    };
  }
  return {
    id,
    soc: parseSoc(raw),
    vermogen_w: Math.round(Number(raw.active_power_w ?? 0)),
    bereikbaar: true,
  };
}

export function mapBatteryV2(
  raw: HomeWizardBatteryV2Measurement | null,
  id: string,
  melding?: string
): BatterijLive {
  if (!raw) {
    return {
      id,
      soc: null,
      vermogen_w: 0,
      bereikbaar: false,
      melding: melding ?? "Niet bereikbaar",
    };
  }
  return {
    id,
    soc: parseSoc(raw),
    vermogen_w: Math.round(Number(raw.power_w ?? 0)),
    bereikbaar: true,
  };
}

export function mapP1BatteriesGroep(
  raw: HomeWizardP1Batteries | null
): BatterijGroep | null {
  if (!raw || raw.battery_count == null) return null;
  return {
    mode: raw.mode ?? "onbekend",
    aantal: Number(raw.battery_count),
    vermogen_w: Math.round(Number(raw.power_w ?? 0)),
    bereikbaar: true,
  };
}

async function fetchBatteryEndpoint(ep: BatteryEndpoint): Promise<BatterijLive> {
  if (ep.token) {
    const v2 = await fetchJsonLocal<HomeWizardBatteryV2Measurement>(
      ep.v2Url,
      V2_HEADERS(ep.token)
    );
    if (v2) return mapBatteryV2(v2, ep.id);
    return mapBatteryV2(null, ep.id, "Token ongeldig of apparaat offline");
  }

  if (ep.v1Url) {
    const v1 = await fetchJsonLocal<HomeWizardBatteryV1Raw>(ep.v1Url);
    if (v1) return mapBatteryV1(v1, ep.id);
  }

  return mapBatteryV2(
    null,
    ep.id,
    "Token ontbreekt (ENERGIE_BATTERY_TOKENS in .env.local)"
  );
}

export async function fetchAllBatterijen(options: {
  endpoints: BatteryEndpoint[];
  p1BatteriesUrl: string | null;
  p1Token: string | undefined;
}): Promise<BatterijFetchResult> {
  const { endpoints, p1BatteriesUrl, p1Token } = options;

  if (endpoints.length === 0) {
    return { batterijen: [], groep: null, hint: null };
  }

  const batterijen = await Promise.all(
    endpoints.map((ep) => fetchBatteryEndpoint(ep))
  );

  let groep: BatterijGroep | null = null;
  if (p1BatteriesUrl && p1Token) {
    const raw = await fetchJsonLocal<HomeWizardP1Batteries>(
      p1BatteriesUrl,
      V2_HEADERS(p1Token)
    );
    groep = mapP1BatteriesGroep(raw);
  }

  const hasOnline = batterijen.some((b) => b.bereikbaar);
  const anyToken = endpoints.some((e) => e.token);
  let hint: string | null = null;
  if (!hasOnline && !anyToken) {
    hint =
      "HomeWizard batterijen vereisen API v2-tokens. Zie .env.example (ENERGIE_BATTERY_TOKENS).";
  } else if (!hasOnline && groep) {
    hint = "Per batterij offline; totaal via P1-meter.";
  }

  return { batterijen, groep, hint };
}

export function aggregateBatterijen(
  batterijen: BatterijLive[],
  groep: BatterijGroep | null
): {
  vermogen_totaal: number;
  soc_gemiddeld: number | null;
} {
  const online = batterijen.filter((b) => b.bereikbaar);
  let vermogen_totaal = online.reduce((s, b) => s + b.vermogen_w, 0);
  const socs = online.map((b) => b.soc).filter((s): s is number => s != null);
  let soc_gemiddeld =
    socs.length > 0
      ? Math.round(socs.reduce((a, b) => a + b, 0) / socs.length)
      : null;

  if (online.length === 0 && groep?.bereikbaar) {
    vermogen_totaal = groep.vermogen_w;
  }

  return { vermogen_totaal, soc_gemiddeld };
}
